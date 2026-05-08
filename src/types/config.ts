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
  guestCustomerSlug: string
  appointmentsSlug: string
  servicesSlug: string
  /**
   * Join collection storing host-specific service configuration (enabled,
   * pricing, payment rules, platform fee).
   */
  hostServiceConfigsSlug: string
  waitlistSlug: string
  sentEmailsSlug: string
  /**
   * Legacy global opening times (used when `schedulingMode === 'global'` or as
   * a fallback during migration).
   */
  openingTimesSlug: string
  /** Where the host schedule is stored on the host document. */
  hostScheduleFieldPath: string
  /** Scheduling source. */
  schedulingMode: 'global' | 'embeddedOnHost'
  /** If true, embedded host schedule is required (no global fallback). */
  requireHostSchedule: boolean
  /** If true, allow falling back to global OpeningTimes during transition. */
  fallbackToGlobalOpeningTimes: boolean
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
  guestCustomerSlug: 'guestCustomers',
  appointmentsSlug: 'appointments',
  servicesSlug: 'services',
  hostServiceConfigsSlug: 'hostServiceConfigs',
  waitlistSlug: 'waitlist',
  sentEmailsSlug: 'sentEmails',
  openingTimesSlug: 'openingTimes',
  hostScheduleFieldPath: 'appointments.schedule',
  schedulingMode: 'global',
  requireHostSchedule: false,
  fallbackToGlobalOpeningTimes: true,
  requireEnabledServicesOnly: false,
  currency: 'USD',
}

/**
 * Stash key used on `payload.config.custom` so server views/components can
 * read the resolved slug configuration at runtime.
 */
export const CUSTOM_CONFIG_KEY = 'appointmentsPlugin'
