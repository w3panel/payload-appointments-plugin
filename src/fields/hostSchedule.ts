import type { Field } from 'payload'

const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const commonTimezones = [
  { label: 'UTC', value: 'UTC' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Berlin (CET/CEST)', value: 'Europe/Berlin' },
  { label: 'Moscow (MSK)', value: 'Europe/Moscow' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Hong Kong (HKT)', value: 'Asia/Hong_Kong' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
  { label: 'Auckland (NZST/NZDT)', value: 'Pacific/Auckland' },
  { label: 'New York (EST/EDT)', value: 'America/New_York' },
  { label: 'Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'Denver (MST/MDT)', value: 'America/Denver' },
  { label: 'Los Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'Toronto (EST/EDT)', value: 'America/Toronto' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
] as const

const timeOnlyAdmin = {
  date: {
    displayFormat: 'h:mm a',
    pickerAppearance: 'timeOnly' as const,
  },
  width: '50%',
}

function validateNoShiftOverlaps(value: unknown): true | string {
  if (!Array.isArray(value) || value.length <= 1) return true

  const shifts = value
    .map((v) => {
      if (!v || typeof v !== 'object') return null
      const start = (v as any).start ? new Date((v as any).start) : null
      const end = (v as any).end ? new Date((v as any).end) : null
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
      return { start, end }
    })
    .filter(Boolean) as Array<{ start: Date; end: Date }>

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

export const buildHostScheduleLeafField = (): Field => ({
  name: 'schedule',
  type: 'group',
  admin: {
    position: 'sidebar',
  },
  // Intentionally labeled "Appointments" so when injected at `appointments`
  // it reads naturally and avoids an extra nested "Schedule" heading.
  label: 'Opening Times (Weekly Schedule)',
  fields: [
    {
      name: 'timezone',
      type: 'select',
      defaultValue: 'UTC',
      label: 'Timezone',
      options: [...commonTimezones],
      required: true,
      admin: {
        position: 'sidebar',
      },
    }, 
    ...daysOfWeek.map(
      (day): Field => ({
        name: day,
        type: 'group',
        label: day.charAt(0).toUpperCase() + day.slice(1),
        fields: [
          {
            name: 'isWorking',
            type: 'checkbox',
            defaultValue: false,
            label: 'Working',
          },
          {
            name: 'shifts',
            type: 'array',
            admin: {
              condition: (_: any, siblingData: any) => siblingData?.isWorking === true,
              description: 'Add one or more shifts (e.g. morning + evening).',
            },
            labels: { plural: 'Shifts', singular: 'Shift' },
            validate: validateNoShiftOverlaps,
            fields: [
              {
                name: 'title',
                type: 'text',
                label: 'Title',
                required: true,
              },
              {
                type: 'row',
                fields: [
                  {
                    name: 'start',
                    type: 'date',
                    admin: timeOnlyAdmin,
                    label: 'Start',
                    required: true,
                  },
                  {
                    name: 'end',
                    type: 'date',
                    admin: timeOnlyAdmin,
                    label: 'End',
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      }),
    ),
  ],
})

const isGroupField = (field: Field): field is Field & { type: 'group'; fields: Field[] } =>
  (field as any)?.type === 'group' && Array.isArray((field as any)?.fields)

/**
 * Injects a leaf field into a nested group path (dot notation).
 *
 * Example:\n
 * - path: 'appointments.schedule'\n
 * - leaf: { name: 'schedule', type: 'group', ... }\n
 * Result:\n
 * - ensures a group field `appointments` exists and contains the `schedule` group.\n
 */
export function injectFieldAtPath(hostFields: Field[], path: string, leaf: Field): void {
  const segments = path.split('.').map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) return

  const leafName = segments[segments.length - 1]
  const containerSegments = segments.slice(0, -1)

  const ensureGroup = (fields: Field[], name: string): Field & { type: 'group'; fields: Field[] } => {
    const existing = fields.find((f) => (f as any)?.name === name)
    if (existing && isGroupField(existing)) return existing as any
    if (existing) {
      // If a non-group field exists with this name, do not overwrite it.
      throw new Error(
        `Cannot inject schedule fields: field path segment '${name}' already exists and is not a group.`,
      )
    }
    const group: Field & { type: 'group'; fields: Field[] } = {
      name,
      type: 'group',
      fields: [],
    } as any
    fields.push(group as any)
    return group
  }

  let currentFields = hostFields
  for (const seg of containerSegments) {
    const group = ensureGroup(currentFields, seg)
    currentFields = group.fields
  }

  const existingLeaf = currentFields.find((f) => (f as any)?.name === leafName)
  if (existingLeaf) return

  currentFields.push({ ...(leaf as any), name: leafName } as any)
}

