import type { Config } from 'payload'

import { buildAppointments } from './collections/Appointments'
import { buildHostServiceConfigs } from './collections/HostServiceConfigs'
import SentEmails from './collections/SentEmails'
import Services from './collections/Services'
import TeamMembers from './collections/TeamMembers'
import { buildWaitlist } from './collections/Waitlist'
import { cancelAppointment } from './endpoints/cancelAppointment'
import { cancelAppointmentByToken } from './endpoints/cancelAppointmentByToken'
import { cancelRecurringAppointment } from './endpoints/cancelRecurringAppointment'
import { getAnalytics } from './endpoints/getAnalytics'
import { getAppointmentByToken } from './endpoints/getAppointmentByToken'
import { buildGetAppointmentsForDayAndHost } from './endpoints/getAppointmentsForDayAndHost'
import { buildGetICalFeed } from './endpoints/getICalFeed'
import { buildPaymentWebhook } from './endpoints/paymentWebhook'
import { updateRecurringAppointment } from './endpoints/updateRecurringAppointment'
import { waitlistJoin } from './endpoints/waitlistJoin'
import { waitlistLeave } from './endpoints/waitlistLeave'
import { waitlistPosition } from './endpoints/waitlistPosition'
import { applyHostTabs } from './fields/hostTabs'
import { buildValidateHostScheduleShiftsHook } from './hooks/validateHostScheduleShiftOverlaps'
import { seedAppointmentsData } from './seed'
import { CUSTOM_CONFIG_KEY, DEFAULT_BUILD_CONFIG } from './types/config'
import type { AppointmentsBuildConfig } from './types/config'

import type { PaymentHooks } from './types'

export type AppointmentsPluginConfig = {
  disabled?: boolean
  paymentHooks?: PaymentHooks
  seedData?: boolean
  showDashboardCards?: boolean
  showNavItems?: boolean
  /** Dot-notation field path where the host schedule is stored on the host document. */
  hostScheduleFieldPath?: string
  /** When `true`, hosts must have a schedule configured. */
  requireHostSchedule?: boolean
  /**
   * Host-specific service configuration.
   */
  hostServices?: {
    /**
     * Slug for the join collection that stores host-specific service config.
     *
     * @default 'hostServiceConfigs'
     */
    hostServiceConfigSlug?: string
    /**
     * If true, only enabled host services can be booked.
     *
     * @default false
     */
    requireEnabledServicesOnly?: boolean
  }
  /**
   * Override admin view component paths. Useful when the host app needs to wrap
   * plugin views with framework-specific templates (e.g. `@payloadcms/next`),
   * while keeping this plugin framework-agnostic.
   */
  adminViews?: {
    appointmentsList?: string
    analytics?: string
  }
  /**
   * Slug of the consumer collection that will own host (provider/practitioner)
   * documents. The collection must expose at least: `id`, `firstName`,
   * `lastName`, `preferredNameAppointments`, `takingAppointments`,
   * `useCustomHours`, `customHours`, `maxAppointmentsPerDay`, `icalToken`.
   *
   * @default 'teamMembers'
   */
  hostCollectionSlug?: string
  /**
   * Slug of the consumer collection used as the customer relation on
   * appointments and waitlist entries.
   *
   * @default 'users'
   */
  customerCollectionSlug?: string
  /**
   * When `true` (default) the plugin registers its built-in `TeamMembers`
   * collection as the host. Set to `false` when supplying your own
   * `hostCollectionSlug`.
   *
   * @default true
   */
  registerHostCollection?: boolean
  /**
   * Whether to register the built-in guest customer collection.
   *
   * @default true
   */
  registerGuestCustomerCollection?: boolean
  /** ISO 4217 currency passed to `paymentHooks` (e.g. 'USD', 'INR'). */
  currency?: string
  /** Free-form payment provider id passed through to `paymentHooks` context. */
  paymentProvider?: string
}

export type { AppointmentsBuildConfig } from './types/config'
export type { Appointment, Host, PaymentHooks, PaymentHookContext } from './types'

export const appointmentsPlugin =
  ({
    disabled = false,
    paymentHooks,
    seedData = false,
    showDashboardCards = true,
    showNavItems = true,
    adminViews,
    hostCollectionSlug,
    customerCollectionSlug,
    registerHostCollection = true,
    registerGuestCustomerCollection = true,
    currency,
    paymentProvider,
    hostServices,
    hostScheduleFieldPath,
    requireHostSchedule,
  }: AppointmentsPluginConfig = {}) =>
  (config: Config): Config => {
    if (!config.collections) {
      config.collections = []
    }

    if (disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    const buildConfig: AppointmentsBuildConfig = {
      ...DEFAULT_BUILD_CONFIG,
      hostSlug: hostCollectionSlug ?? DEFAULT_BUILD_CONFIG.hostSlug,
      customerSlug: customerCollectionSlug ?? DEFAULT_BUILD_CONFIG.customerSlug,
      currency: currency ?? DEFAULT_BUILD_CONFIG.currency,
      paymentProvider,
      hostScheduleFieldPath: hostScheduleFieldPath ?? DEFAULT_BUILD_CONFIG.hostScheduleFieldPath,
      requireHostSchedule: requireHostSchedule ?? DEFAULT_BUILD_CONFIG.requireHostSchedule,
      hostServiceConfigsSlug:
        hostServices?.hostServiceConfigSlug ?? DEFAULT_BUILD_CONFIG.hostServiceConfigsSlug,
      requireEnabledServicesOnly:
        hostServices?.requireEnabledServicesOnly ?? DEFAULT_BUILD_CONFIG.requireEnabledServicesOnly,
    }

    // Stash the resolved config on `payload.config.custom` so server admin
    // views (and any consumer code) can read the active slugs at runtime.
    ;(config as Config & { custom?: Record<string, unknown> }).custom = {
      ...(config as Config & { custom?: Record<string, unknown> }).custom,
      [CUSTOM_CONFIG_KEY]: buildConfig,
    }

    const Appointments = buildAppointments(buildConfig, paymentHooks)
    const Waitlist = buildWaitlist(buildConfig)
    const HostServiceConfigs = buildHostServiceConfigs(buildConfig)

    config.collections = [
      ...(config.collections || []),
      Appointments,
      SentEmails,
      ...(registerHostCollection ? [TeamMembers] : []),
      Services,
      HostServiceConfigs,
      Waitlist,
    ]
    config.globals = [...(config.globals || [])]

    const hostCollection = config.collections.find((c) => c.slug === buildConfig.hostSlug)
    if (!hostCollection) {
      throw new Error(
        `payload-appointments-plugin: Host collection '${buildConfig.hostSlug}' was not found. ` +
          `Ensure it is registered before applying appointmentsPlugin, or set registerHostCollection=true.`,
      )
    }
    applyHostTabs(hostCollection, buildConfig)

    const validateHostScheduleShifts = buildValidateHostScheduleShiftsHook(
      buildConfig.hostScheduleFieldPath,
    )
    const hostHooks = hostCollection.hooks ?? {}
    const hostBeforeValidate = hostHooks.beforeValidate ?? []
    hostCollection.hooks = {
      ...hostHooks,
      beforeValidate: [...hostBeforeValidate, validateHostScheduleShifts],
    }

    config.admin = {
      ...config.admin,
      components: {
        ...config.admin.components,
        beforeDashboard: [
          ...(config.admin?.components?.beforeDashboard || []),
          ...(showDashboardCards ? ['payload-appointments-plugin/BeforeDashboard'] : []),
        ],
        beforeNavLinks: [
          ...(config.admin?.components?.beforeNavLinks || []),
          ...(showNavItems ? ['payload-appointments-plugin/BeforeNavLinks'] : []),
        ],
        views: {
          ...config.admin.components.views,
          AppointmentsList: {
            Component:
              adminViews?.appointmentsList ?? 'payload-appointments-plugin/AppointmentsList',
            exact: true,
            path: '/appointments/schedule',
          },
          AnalyticsView: {
            Component: adminViews?.analytics ?? 'payload-appointments-plugin/AnalyticsView',
            exact: true,
            path: '/appointments/analytics',
          },
        },
      },
    }

    config.endpoints = [
      ...(config.endpoints || []),
      {
        handler: buildGetAppointmentsForDayAndHost(buildConfig),
        method: 'get',
        path: '/get-available-appointment-slots',
      },
      {
        handler: cancelAppointment,
        method: 'post',
        path: '/cancel-appointment',
      },
      {
        handler: getAppointmentByToken,
        method: 'get',
        path: '/appointment-by-token',
      },
      {
        handler: cancelAppointmentByToken,
        method: 'post',
        path: '/cancel-appointment-by-token',
      },
      {
        handler: getAnalytics,
        method: 'get',
        path: '/appointments-analytics',
      },
      {
        handler: buildPaymentWebhook(buildConfig, paymentHooks),
        method: 'post',
        path: '/appointments-payment-webhook',
      },
      {
        handler: updateRecurringAppointment,
        method: 'put',
        path: '/update-recurring-appointment',
      },
      {
        handler: cancelRecurringAppointment,
        method: 'post',
        path: '/cancel-recurring-appointment',
      },
      {
        handler: buildGetICalFeed(buildConfig),
        method: 'get',
        path: '/appointments-ical',
      },
      {
        handler: waitlistJoin,
        method: 'post',
        path: '/waitlist/join',
      },
      {
        handler: waitlistLeave,
        method: 'delete',
        path: '/waitlist/leave',
      },
      {
        handler: waitlistPosition,
        method: 'get',
        path: '/waitlist/position',
      },
    ]

    const incomingOnInit = config.onInit

    config.onInit = async (payload) => {
      if (incomingOnInit) {
        await incomingOnInit(payload)
      }

      if (seedData) {
        await seedAppointmentsData(payload, buildConfig)
      }
    }

    return config
  }
