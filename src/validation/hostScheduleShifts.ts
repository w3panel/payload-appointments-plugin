export const SCHEDULE_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type ScheduleDayKey = (typeof SCHEDULE_DAY_KEYS)[number]

export function validateShiftsArrayNoOverlap(value: unknown): true | string {
  if (!Array.isArray(value) || value.length === 0) return true

  const shifts = value
    .map((v) => {
      if (!v || typeof v !== 'object') return null
      const row = v as { start?: unknown; end?: unknown }
      const start = row.start ? new Date(row.start as string | number | Date) : null
      const end = row.end ? new Date(row.end as string | number | Date) : null
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
        return null
      return { start, end }
    })
    .filter(Boolean) as Array<{ start: Date; end: Date }>

  if (shifts.length === 0) return true

  shifts.sort((a, b) => a.start.getTime() - b.start.getTime())

  for (let i = 0; i < shifts.length; i++) {
    const { start, end } = shifts[i]
    if (end.getTime() <= start.getTime()) {
      return 'Shift end time must be after start time.'
    }
    if (i > 0) {
      const prev = shifts[i - 1]
      if (start.getTime() < prev.end.getTime()) {
        return 'Shifts in a day cannot overlap.'
      }
    }
  }

  return true
}

export function validateScheduleGroupShiftsNoOverlap(schedule: unknown): true | string {
  if (!schedule || typeof schedule !== 'object') return true

  const group = schedule as Record<string, unknown>

  for (const day of SCHEDULE_DAY_KEYS) {
    const dayData = group[day]
    if (!dayData || typeof dayData !== 'object') continue
    const shifts = (dayData as { shifts?: unknown }).shifts
    if (!Array.isArray(shifts) || shifts.length === 0) continue

    const result = validateShiftsArrayNoOverlap(shifts)
    if (result !== true) {
      return `${day}: ${result}`
    }
  }

  return true
}
