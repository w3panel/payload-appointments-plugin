import type { PayloadHandler, PayloadRequest } from 'payload'

import moment from 'moment'
import momentTz from 'moment-timezone'

import type { AppointmentsBuildConfig } from '../types/config'
import { DEFAULT_BUILD_CONFIG } from '../types/config'

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

type HostCustomHours = {
  [key in DayOfWeek]?: {
    end?: string | null
    isWorking?: boolean
    start?: string | null
  }
}

type HostDoc = {
  maxAppointmentsPerDay?: number
}

type HostScheduleShift = {
  end?: string | null
  start?: string | null
}

type HostScheduleDay = {
  isWorking?: boolean
  shifts?: HostScheduleShift[]
}

type HostEmbeddedSchedule = {
  timezone?: string
  weekly?: Partial<Record<DayOfWeek, HostScheduleDay>>
}

type BookingWindowConfig = {
  minLeadTime: number
  maxAdvanceBooking: number
  earliestBookableTime: string | null
  latestBookableDate: string | null
}

const getAtPath = (doc: unknown, path: string): unknown => {
  if (!doc || typeof doc !== 'object') return undefined
  const segments = path.split('.').map((s) => s.trim()).filter(Boolean)
  let current: any = doc
  for (const seg of segments) {
    if (!current || typeof current !== 'object') return undefined
    current = current[seg]
  }
  return current
}

const buildDayTimeInTimezone = (dayISO: string, timeISO: string, timezone: string): moment.Moment => {
  const time = momentTz.tz(timeISO, timezone)
  return momentTz
    .tz(dayISO, timezone)
    .startOf('day')
    .set({
      hour: time.hour(),
      minute: time.minute(),
      second: 0,
      millisecond: 0,
    })
}

const curateSlots = (
  slotInterval: number,
  startTime: string,
  endTime: string,
  bookingWindow: BookingWindowConfig,
): string[] => {
  const slots: string[] = []
  const current = moment(startTime)
  const end = moment(endTime)
  const now = moment()
  const earliestBookable = bookingWindow.earliestBookableTime
    ? moment(bookingWindow.earliestBookableTime)
    : now

  while (current.isBefore(end)) {
    if (current.isAfter(earliestBookable)) {
      slots.push(current.format('YYYY-MM-DDTHH:mm:ss.SSSZ'))
    }
    current.add(slotInterval, 'minutes')
  }

  return slots
}

const filterSlotsForHost = async (
  config: AppointmentsBuildConfig,
  req: PayloadRequest,
  day: string,
  availableSlots: string[],
  slotDuration: number,
  hostId?: string,
  maxAppointmentsPerDay?: number,
): Promise<string[]> => {
  const startOfDay = moment(day).startOf('day')
  const endOfDay = moment(day).endOf('day')

  const whereClause: any = {
    and: [
      {
        start: {
          greater_than_equal: startOfDay.toISOString(),
          less_than_equal: endOfDay.toISOString(),
        },
      },
      {
        status: {
          not_equals: 'cancelled',
        },
      },
    ],
  }

  if (hostId) {
    whereClause.and.push({
      host: {
        equals: hostId,
      },
    })
  }

  const existingAppointments = await req.payload.find({
    collection: config.appointmentsSlug as 'appointments',
    depth: 0,
    limit: 100,
    where: whereClause,
  })

  if (maxAppointmentsPerDay && maxAppointmentsPerDay > 0) {
    const appointmentCount = existingAppointments.docs.filter(
      (a: any) => a.appointmentType === 'appointment',
    ).length
    if (appointmentCount >= maxAppointmentsPerDay) {
      return []
    }
  }

  return availableSlots.filter((slot) => {
    const slotStart = moment(slot)
    const slotEnd = slotStart.clone().add(slotDuration, 'minutes')

    const hasOverlap = existingAppointments.docs.some((appointment: any) => {
      const appointmentStart = moment(appointment.start)
      const appointmentEnd = moment(appointment.end)

      return slotStart.isBefore(appointmentEnd) && slotEnd.isAfter(appointmentStart)
    })

    return !hasOverlap
  })
}

export const buildGetAppointmentsForDayAndHost =
  (config: AppointmentsBuildConfig): PayloadHandler =>
  async (req: PayloadRequest) => {
    try {
      const { day, host, services } = req.query

      if (!services || !day || typeof services !== 'string' || typeof day !== 'string') {
        return Response.json(
          { error: 'Missing or invalid services or day parameter' },
          { status: 400 },
        )
      }

      const hostId = typeof host === 'string' ? host : undefined

      const servicesArray = services.split(',')
      const servicesData = await req.payload.find({
        collection: config.servicesSlug as 'services',
        depth: 0,
        where: {
          id: {
            in: servicesArray,
          },
        },
      })

      const totalDuration = servicesData.docs.reduce(
        (total: number, service: any) => total + (service.duration || 0),
        0,
      )

      const maxBufferTime = servicesData.docs.reduce(
        (max: number, service: any) => Math.max(max, service.bufferTime || 0),
        0,
      )

      const slotDuration = totalDuration + maxBufferTime

      const maxMinLeadTime = servicesData.docs.reduce(
        (max: number, service: any) => Math.max(max, service.minLeadTime || 0),
        0,
      )

      const nonZeroMaxAdvance = servicesData.docs
        .map((s: any) => s.maxAdvanceBooking || 0)
        .filter((v: number) => v > 0)
      const effectiveMaxAdvance = nonZeroMaxAdvance.length > 0 ? Math.min(...nonZeroMaxAdvance) : 0

      const now = moment()
      const earliestBookableTime =
        maxMinLeadTime > 0 ? now.clone().add(maxMinLeadTime, 'hours').toISOString() : null
      const latestBookableDate =
        effectiveMaxAdvance > 0
          ? now.clone().add(effectiveMaxAdvance, 'days').endOf('day').toISOString()
          : null

      const bookingWindow: BookingWindowConfig = {
        minLeadTime: maxMinLeadTime,
        maxAdvanceBooking: effectiveMaxAdvance,
        earliestBookableTime,
        latestBookableDate,
      }

      const requestedDay = moment(day).startOf('day')
      if (latestBookableDate && requestedDay.isAfter(moment(latestBookableDate))) {
        return Response.json({
          availableSlots: [],
          bookingWindow,
          filteredSlots: [],
          message: `Cannot book more than ${effectiveMaxAdvance} days in advance`,
        })
      }

      const dayOfWeek = moment(day).format('dddd').toLowerCase() as DayOfWeek

      let opening: string | null = null
      let closing: string | null = null
      let isOpen = false
      let embeddedSchedule: HostEmbeddedSchedule | null = null
      let maxAppointmentsPerDay: number | undefined

      if (hostId) {
        const hostDoc = (await req.payload.findByID({
          id: hostId,
          collection: config.hostSlug as any,
          depth: 0,
        })) as unknown as HostDoc

        embeddedSchedule = (getAtPath(hostDoc as any, config.hostScheduleFieldPath) ??
          null) as HostEmbeddedSchedule | null

        maxAppointmentsPerDay = hostDoc?.maxAppointmentsPerDay
      }

      // Embedded host schedule with multi-shift support
      if (hostId) {
        const tz = embeddedSchedule?.timezone || 'UTC'
        const dayConfig = embeddedSchedule?.weekly?.[dayOfWeek]

        if (!dayConfig?.isWorking) {
          return Response.json({ availableSlots: [], filteredSlots: [] })
        } else if (Array.isArray(dayConfig.shifts) && dayConfig.shifts.length > 0) {
          const allSlots: string[] = []
          for (const shift of dayConfig.shifts) {
            if (!shift?.start || !shift?.end) continue
            const shiftStart = buildDayTimeInTimezone(day, shift.start, tz)
            const shiftEnd = buildDayTimeInTimezone(day, shift.end, tz)
            if (!shiftEnd.isAfter(shiftStart)) continue
            allSlots.push(
              ...curateSlots(totalDuration, shiftStart.toISOString(), shiftEnd.toISOString(), bookingWindow),
            )
          }

          const filteredSlots = await filterSlotsForHost(
            config,
            req,
            day,
            allSlots,
            slotDuration,
            hostId,
            maxAppointmentsPerDay,
          )

          return Response.json({
            availableSlots: allSlots,
            bookingWindow,
            bufferTime: maxBufferTime,
            filteredSlots,
            slotDuration,
          })
        } else {
          return Response.json({ availableSlots: [], filteredSlots: [] })
        }
      }

      // With embedded scheduling enabled, we should have returned above.
      if (!opening || !closing) return Response.json({ availableSlots: [], filteredSlots: [] })

      if (!isOpen || !opening || !closing) {
        return Response.json({
          availableSlots: [],
          filteredSlots: [],
        })
      }

      const openingMoment = moment(opening)
      const closingMoment = moment(closing)

      const startTime = moment(day).set({
        hour: openingMoment.hour(),
        millisecond: 0,
        minute: openingMoment.minute(),
        second: 0,
      })
      const endTime = moment(day).set({
        hour: closingMoment.hour(),
        millisecond: 0,
        minute: closingMoment.minute(),
        second: 0,
      })

      const availableSlots = curateSlots(
        totalDuration,
        startTime.toISOString(),
        endTime.toISOString(),
        bookingWindow,
      )
      const filteredSlots = await filterSlotsForHost(
        config,
        req,
        day,
        availableSlots,
        slotDuration,
        hostId,
        maxAppointmentsPerDay,
      )

      return Response.json({
        availableSlots,
        bookingWindow,
        bufferTime: maxBufferTime,
        filteredSlots,
        slotDuration,
      })
    } catch (error) {
      req.payload.logger.error(`Error getting appointments: ${error}`)
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

/** Backwards-compatible default export bound to the default slug configuration. */
export const getAppointmentsForDayAndHost: PayloadHandler =
  buildGetAppointmentsForDayAndHost(DEFAULT_BUILD_CONFIG)
