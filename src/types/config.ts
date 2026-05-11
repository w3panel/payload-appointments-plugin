/**
 * Resolved internal configuration for the appointments plugin.
 *
 * Every collection slug the plugin references is read from this object so the
 * plugin can be reused with consumer-supplied collections (e.g. a `doctors`
 * collection in place of the default `teamMembers`).
 */
export type AppointmentsBuildConfig = {
  hostSlug: string
  customerSlug: string
  appointmentsSlug: string
  servicesSlug: string
  /**
   * Join collection storing host-specific service configuration (enabled,
   * pricing, payment rules, platform fee).
   */
  hostServiceConfigsSlug: string
  waitlistSlug: string
  sentEmailsSlug: string
  /** Where the host schedule is stored on the host document. */
  hostScheduleFieldPath: string
  /** If true, host schedule is required. */
  requireHostSchedule: boolean
  /** If true, only allow booking enabled host services. */
  requireEnabledServicesOnly: boolean
  /** ISO 4217 currency code passed to payment providers (e.g. 'USD', 'INR'). */
  currency: string
  /** Free-form provider id used for logging/dispatch (e.g. 'stripe'). */
  paymentProvider?: string
}

export const DEFAULT_BUILD_CONFIG: AppointmentsBuildConfig = {
  hostSlug: 'teamMembers',
  customerSlug: 'users',
  appointmentsSlug: 'appointments',
  servicesSlug: 'services',
  hostServiceConfigsSlug: 'hostServiceConfigs',
  waitlistSlug: 'waitlist',
  sentEmailsSlug: 'sentEmails',
  hostScheduleFieldPath: 'appointments.schedule',
  requireHostSchedule: false,
  requireEnabledServicesOnly: false,
  currency: 'USD',
}

/**
 * Stash key used on `payload.config.custom` so server views/components can
 * read the resolved slug configuration at runtime.
 */
export const CUSTOM_CONFIG_KEY = 'appointmentsPlugin'
