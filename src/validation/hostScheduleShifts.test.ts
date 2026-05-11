import { describe, expect, it } from 'vitest'

import {
  validateScheduleGroupShiftsNoOverlap,
  validateShiftsArrayNoOverlap,
} from './hostScheduleShifts'

const t = (h: number, m: number) => new Date(Date.UTC(1970, 0, 1, h, m, 0, 0)).toISOString()

describe('validateShiftsArrayNoOverlap', () => {
  it('allows non-overlapping shifts', () => {
    expect(
      validateShiftsArrayNoOverlap([
        { start: t(9, 0), end: t(12, 0) },
        { start: t(13, 0), end: t(17, 0) },
      ]),
    ).toBe(true)
  })

  it('allows adjacent shifts when next start equals previous end', () => {
    expect(
      validateShiftsArrayNoOverlap([
        { start: t(9, 0), end: t(12, 0) },
        { start: t(12, 0), end: t(17, 0) },
      ]),
    ).toBe(true)
  })

  it('rejects overlapping shifts', () => {
    const r = validateShiftsArrayNoOverlap([
      { start: t(9, 0), end: t(13, 0) },
      { start: t(12, 0), end: t(17, 0) },
    ])
    expect(r).toBe('Shifts in a day cannot overlap.')
  })

  it('rejects when end is not after start', () => {
    const r = validateShiftsArrayNoOverlap([{ start: t(10, 0), end: t(10, 0) }])
    expect(r).toBe('Shift end time must be after start time.')
  })

  it('rejects when end is before start', () => {
    const r = validateShiftsArrayNoOverlap([{ start: t(11, 0), end: t(10, 0) }])
    expect(r).toBe('Shift end time must be after start time.')
  })
})

describe('validateScheduleGroupShiftsNoOverlap', () => {
  it('prefixes day name on failure', () => {
    const r = validateScheduleGroupShiftsNoOverlap({
      monday: {
        shifts: [
          { start: t(9, 0), end: t(13, 0) },
          { start: t(12, 0), end: t(17, 0) },
        ],
      },
    })
    expect(r).toBe('monday: Shifts in a day cannot overlap.')
  })

  it('returns true when schedule is missing', () => {
    expect(validateScheduleGroupShiftsNoOverlap(undefined)).toBe(true)
  })
})
