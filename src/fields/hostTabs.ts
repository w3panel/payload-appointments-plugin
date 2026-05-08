import type { CollectionConfig, Field } from 'payload'

import type { AppointmentsBuildConfig } from '../types/config'
import { buildHostScheduleLeafField } from './hostSchedule'

type GroupField = Field & { type: 'group'; fields: Field[]; name: string }
type TabsField = Field & { type: 'tabs'; tabs: Array<{ label: string; fields: Field[] }> }

const isNamedField = (field: Field): field is Field & { name: string } =>
  typeof (field as any)?.name === 'string' || (field as any)?.type === 'raw'

const isGroupField = (field: Field): field is GroupField =>
  (field as any)?.type === 'group' && Array.isArray((field as any)?.fields)

function ensureGroup(fields: Field[], name: string, label?: string): GroupField {
  const existing = fields.find((f) => (f as any)?.name === name)
  if (existing) {
    if (isGroupField(existing)) return existing
    throw new Error(
      `payload-appointments-plugin: cannot create group '${name}' because a non-group field already exists at that name.`,
    )
  }

  const group: GroupField = {
    name,
    type: 'group',
    ...(label ? { label } : {}),
    fields: [],
  } as any

  fields.push(group as any)
  return group
}

function ensureScheduleAtPath(hostFields: Field[], hostScheduleFieldPath: string): void {
  const segments = hostScheduleFieldPath.split('.').map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) return

  const leafName = segments[segments.length - 1]!
  const containerSegments = segments.slice(0, -1)

  let currentFields = hostFields
  for (const seg of containerSegments) {
    const group = ensureGroup(currentFields, seg)
    currentFields = group.fields
  }

  const existing = currentFields.find((f) => (f as any)?.name === leafName)
  if (existing) return

  const scheduleLeaf = buildHostScheduleLeafField()
  currentFields.push({ ...(scheduleLeaf as any), name: leafName } as any)
}

/**
 * Convert a host collection into a tabbed edit view layout while preserving:
 * - existing sidebar fields outside of tabs
 * - the embedded schedule data shape at `config.hostScheduleFieldPath`
 */
export function applyHostTabs(
  hostCollection: CollectionConfig,
  config: AppointmentsBuildConfig,
): CollectionConfig {
  if (!hostCollection.fields) hostCollection.fields = []

  // Ensure the embedded schedule exists at the configured dot-path.
  ensureScheduleAtPath(hostCollection.fields as Field[], config.hostScheduleFieldPath)

  const all = hostCollection.fields as Field[]

  // Keep any sidebar fields (and any unnamed layout-only fields) outside tabs.
  const sidebarOrUntabbed: Field[] = []
  const mainFields: Field[] = []

  for (const field of all) {
    const isSidebar = Boolean((field as any)?.admin?.position === 'sidebar')
    if (!isNamedField(field) || isSidebar) {
      sidebarOrUntabbed.push(field)
    } else {
      mainFields.push(field)
    }
  }

  // Avoid double-wrapping if called more than once.
  const existingTabs = mainFields.find((f) => (f as any)?.type === 'tabs') as TabsField | undefined
  if (existingTabs) {
    hostCollection.fields = [...sidebarOrUntabbed, ...mainFields]
    return hostCollection
  }

  const rootSegment = config.hostScheduleFieldPath.split('.').map((s) => s.trim()).filter(Boolean)[0]
  const openingTimesFields: Field[] = []
  const hostFields: Field[] = []

  for (const field of mainFields) {
    if (rootSegment && (field as any)?.name === rootSegment) {
      openingTimesFields.push(field)
    } else {
      hostFields.push(field)
    }
  }

  // If the root container wasn't present for some reason, ensure it's there so the tab renders something.
  if (rootSegment && openingTimesFields.length === 0) {
    // Attach the container to the source list so data is persisted, but render it in the Opening Times tab.
    const ensured = ensureGroup(all, rootSegment)
    // Avoid leaking the container into the Host tab if we had to synthesize it.
    openingTimesFields.push(ensured)
  }

  const servicesUIField: Field = {
      name: 'doctorServicePaymentConfigs',
      type: 'join',
      collection: 'doctorServicePaymentConfigs',
      on: 'doctor',
    }

  const tabsField: Field = {
    type: 'tabs',
    tabs: [
      {
        label: 'Host',
        fields: hostFields,
      },
      {
        label: 'Opening Times',
        fields: openingTimesFields,
      },
      {
        label: 'Services',
        fields: [servicesUIField],
      },
    ],
  }

  hostCollection.fields = [...sidebarOrUntabbed, tabsField]
  return hostCollection
}

