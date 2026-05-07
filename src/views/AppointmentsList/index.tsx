import type { AdminViewProps } from 'payload';

import { DefaultTemplate } from '@payloadcms/next/templates';

import type { Appointment, Host } from '../../types';

import { AppointmentProvider } from '../../providers/AppointmentsProvider';
import { CUSTOM_CONFIG_KEY, DEFAULT_BUILD_CONFIG } from '../../types/config';
import type { AppointmentsBuildConfig } from '../../types/config';

import AppointmentsListClient from './index.client';

const AppointmentsList: React.FC<AdminViewProps> = async ({
  initPageResult,
  params,
  searchParams,
}) => {
  const { payload } = initPageResult.req;

  const buildConfig =
    ((payload.config as unknown as { custom?: Record<string, unknown> }).custom?.[
      CUSTOM_CONFIG_KEY
    ] as AppointmentsBuildConfig | undefined) ?? DEFAULT_BUILD_CONFIG;

  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const [appointmentsRes, hostsRes] = await Promise.all([
    payload.find({
      collection: buildConfig.appointmentsSlug as 'appointments',
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
      collection: buildConfig.hostSlug as 'teamMembers',
      limit: 100,
    }),
  ]);

  const apiRoute = payload.config.routes.api;

  return (
    <AppointmentProvider>
      <DefaultTemplate
        i18n={initPageResult.req.i18n}
        locale={initPageResult.locale}
        params={params}
        payload={payload}
        permissions={initPageResult.permissions}
        searchParams={searchParams}
        user={initPageResult.req.user || undefined}
        visibleEntities={initPageResult.visibleEntities}
      >
        <AppointmentsListClient
          apiRoute={apiRoute}
          collectionSlug={buildConfig.appointmentsSlug}
          hostSlug={buildConfig.hostSlug}
          initialAppointments={appointmentsRes.docs as unknown as Appointment[]}
          initialHosts={hostsRes.docs as unknown as Host[]}
        />
      </DefaultTemplate>
    </AppointmentProvider>
  );
};

export default AppointmentsList;
