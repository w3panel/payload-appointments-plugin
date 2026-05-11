import type { Appointment as AppointmentType, Host } from '../../types'
import type { ReactElement } from 'react'

import CalendarClient from './CalendarClient'
import './styles.scss'

interface CalendarProps {
  apiRoute: string
  collectionSlug: string
  hostSlug: string
  initialAppointments: AppointmentType[]
  initialHosts: Host[]
}

export default function Calendar({
  apiRoute,
  collectionSlug,
  hostSlug,
  initialAppointments,
  initialHosts,
}: CalendarProps): ReactElement {
  return (
    <CalendarClient
      apiRoute={apiRoute}
      collectionSlug={collectionSlug}
      hostSlug={hostSlug}
      initialAppointments={initialAppointments}
      initialHosts={initialHosts}
    />
  )
}
