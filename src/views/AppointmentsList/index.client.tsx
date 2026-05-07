'use client';

import { useStepNav } from '@payloadcms/ui';
import { useEffect } from 'react';

import type { Appointment, Host } from '../../types';

import Calendar from '../../components/Appointments/index';

interface AppointmentsListClientProps {
  apiRoute: string;
  collectionSlug: string;
  hostSlug: string;
  initialAppointments: Appointment[];
  initialHosts: Host[];
}

const AppointmentsListClient: React.FC<AppointmentsListClientProps> = ({
  apiRoute,
  collectionSlug,
  hostSlug,
  initialAppointments,
  initialHosts,
}) => {
  const { setStepNav } = useStepNav();

  useEffect(() => {
    setStepNav([
      {
        label: 'Appointments List',
      },
    ]);
  }, [setStepNav]);

  return (
    <div className="collection-list appointments-calendar-view">
      <header className="list-header">
        <h1>Appointments</h1>
      </header>
      <Calendar
        apiRoute={apiRoute}
        collectionSlug={collectionSlug}
        hostSlug={hostSlug}
        initialAppointments={initialAppointments}
        initialHosts={initialHosts}
      />
    </div>
  );
};

export default AppointmentsListClient;
