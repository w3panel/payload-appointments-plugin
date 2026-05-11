import type { PayloadHandler, PayloadRequest } from 'payload'

import type { Appointment } from '../types'
import type { AppointmentsBuildConfig } from '../types/config'
import { DEFAULT_BUILD_CONFIG } from '../types/config'

import { generateICalFeed } from '../utilities/ical'

function toISOStringWithDayBoundary(date: Date, boundary: 'start' | 'end') {
  const d = new Date(date)
  if (boundary === 'start') {
    d.setHours(0, 0, 0, 0)
  } else {
    d.setHours(23, 59, 59, 999)
  }
  return d.toISOString()
}

function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export const buildGetICalFeed =
  (config: AppointmentsBuildConfig): PayloadHandler =>
  async (req: PayloadRequest) => {
    try {
      const { host, token, months } = req.query

      if (!token || typeof token !== 'string') {
        return Response.json({ error: 'Authentication token required' }, { status: 401 })
      }

      const feedToken = await req.payload.find({
        collection: config.hostSlug as any,
        depth: 0,
        limit: 1,
        where: {
          icalToken: { equals: token },
        },
      })

      if (feedToken.totalDocs === 0) {
        return Response.json({ error: 'Invalid token' }, { status: 401 })
      }

      const tokenHost = feedToken.docs[0] as {
        id: string | number
        firstName?: string
        lastName?: string
        preferredNameAppointments?: string
      }
      const effectiveHostId = String(tokenHost.id)

      // Token must match the requested host to avoid leaking other hosts' calendars.
      if (host && typeof host === 'string' && host !== effectiveHostId) {
        return Response.json({ error: 'Invalid token' }, { status: 401 })
      }

      const monthsAheadRaw = months && typeof months === 'string' ? parseInt(months, 10) : 3
      const monthsAhead = Number.isFinite(monthsAheadRaw)
        ? Math.min(Math.max(monthsAheadRaw, 0), 12)
        : 3

      const now = new Date()
      const startDate = toISOStringWithDayBoundary(addMonths(now, -1), 'start')
      const endDate = toISOStringWithDayBoundary(addMonths(now, monthsAhead), 'end')

      const whereClause: any = {
        and: [
          { appointmentType: { equals: 'appointment' } },
          { start: { greater_than_equal: startDate } },
          { start: { less_than_equal: endDate } },
          { status: { not_in: ['cancelled'] } },
        ],
      }

      if (effectiveHostId) {
        whereClause.and.push({ host: { equals: effectiveHostId } })
      }

      const appointments = await req.payload.find({
        collection: config.appointmentsSlug as 'appointments',
        depth: 0,
        limit: 500,
        select: {
          id: true,
          title: true,
          start: true,
          end: true,
          status: true,
          appointmentType: true,
          host: true,
        },
        where: whereClause,
      })

      const baseUrl =
        req.headers.get('origin') || req.headers.get('host') || 'https://appointments.example.com'

      const hostName =
        tokenHost.preferredNameAppointments ||
        `${tokenHost.firstName || ''} ${tokenHost.lastName || ''}`.trim() ||
        'Appointments'

      const calendarName = `${hostName}'s Schedule`

      const icalContent = generateICalFeed(
        appointments.docs as unknown as Appointment[],
        calendarName,
        baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`,
      )

      return new Response(icalContent, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="appointments.ics"',
          'Cache-Control': 'private, max-age=60',
        },
      })
    } catch (error) {
      req.payload.logger.error(`iCal feed error: ${error}`)
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

/** Backwards-compatible default export bound to default slugs. */
export const getICalFeed: PayloadHandler = buildGetICalFeed(DEFAULT_BUILD_CONFIG)
