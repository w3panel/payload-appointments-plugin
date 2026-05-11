import type { AdminViewProps } from 'payload'

import type { Appointment, Host } from '../../types'

import { AppointmentProvider } from '../../providers/AppointmentsProvider'
import { CUSTOM_CONFIG_KEY, DEFAULT_BUILD_CONFIG } from '../../types/config'
import type { AppointmentsBuildConfig } from '../../types/config'

import AppointmentsListClient from './index.client'

const AppointmentsList: React.FC<AdminViewProps> = async ({
  initPageResult,
  params,
  searchParams,
}) => {
  const { payload } = initPageResult.req

  const buildConfig =
    ((payload.config as unknown as { custom?: Record<string, unknown> }).custom?.[
      CUSTOM_CONFIG_KEY
    ] as AppointmentsBuildConfig | undefined) ?? DEFAULT_BUILD_CONFIG

  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  const [appointmentsRes, hostsRes] = await Promise.all([
    payload.find({
      collection: buildConfig.appointmentsSlug as any,
      depth: 1,
      limit: 500,
      where: {
        and: [
          {
            start: {
              greater_than_equal: startOfDay.toISOString(),
            },
          },
          {
            end: {
              less_than_equal: endOfDay.toISOString(),
            },
          },
        ],
      },
    }),
    payload.find({
      collection: buildConfig.hostSlug as any,
      limit: 100,
    }),
  ])

  const apiRoute = payload.config.routes.api

  return (
    <AppointmentProvider>
      <AppointmentsListClient
        apiRoute={apiRoute}
        collectionSlug={buildConfig.appointmentsSlug}
        hostSlug={buildConfig.hostSlug}
        initialAppointments={appointmentsRes.docs as unknown as Appointment[]}
        initialHosts={hostsRes.docs as unknown as Host[]}
      />
    </AppointmentProvider>
  )
}

export default AppointmentsList
