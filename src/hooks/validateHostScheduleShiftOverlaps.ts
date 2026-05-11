import type { CollectionBeforeValidateHook } from 'payload'

import { getAtPath } from '../lib/getAtPath'
import { validateScheduleGroupShiftsNoOverlap } from '../validation/hostScheduleShifts'

export const buildValidateHostScheduleShiftsHook = (
  hostScheduleFieldPath: string,
): CollectionBeforeValidateHook => {
  return ({ data, originalDoc }) => {
    const merged = {
      ...(typeof originalDoc === 'object' && originalDoc !== null ? originalDoc : {}),
      ...(typeof data === 'object' && data !== null ? data : {}),
    } as Record<string, unknown>

    const schedule = getAtPath(merged, hostScheduleFieldPath)
    const result = validateScheduleGroupShiftsNoOverlap(schedule)
    if (result !== true) {
      throw new Error(result)
    }
    return data
  }
}
