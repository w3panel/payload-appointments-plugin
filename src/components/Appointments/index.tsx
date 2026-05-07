import type { Appointment as AppointmentType, Host } from '../../types'

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
}: CalendarProps) {
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
