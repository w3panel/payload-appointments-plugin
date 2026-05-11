/**
 * Read a nested property from `doc` using dot notation (e.g. `appointments.schedule`).
 */
export const getAtPath = (doc: unknown, path: string): unknown => {
  if (!doc || typeof doc !== 'object') return undefined
  const segments = path
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  let current: unknown = doc
  for (const seg of segments) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[seg]
  }
  return current
}
