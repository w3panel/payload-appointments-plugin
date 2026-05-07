export interface PluginTypes {
  overrides?: {};
  showDashboardCards?: boolean;
  showNavItems?: boolean;
}

export type OpeningTimes = {
  [key: string]: {
    closing: string;
    isOpen: boolean;
    opening: string;
  };
} & {
  createdAt: string;
  globalType: 'openingTime';
  id: string;
  timezone: string;
  updatedAt: string;
};

export interface GuestCustomer {
  createdAt: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone?: string | null;
  updatedAt: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';

/**
 * Generic shape for the appointment "host" relation.
 *
 * The plugin ships a built-in `TeamMember` host collection but consumers can
 * point the host relation at their own collection (e.g. `Doctor`). Any host
 * doc that satisfies this shape can act as a host.
 */
export interface Host {
  id: string | number;
  email?: string;
  firstName?: null | string;
  lastName?: null | string;
  preferredNameAppointments?: null | string;
  takingAppointments?: boolean | null;
}

export interface Appointment {
  appointmentType: 'appointment' | 'blockout';
  bookedBy?: 'customer' | 'guest';
  cancelledAt?: string;
  cancellationToken?: string;
  customer?: User;
  customerNotes?: string;
  end: string;
  guestCustomer?: GuestCustomer;
  host: Host;
  hostId?: string;
  id: string;
  internalNotes?: string;
  payment?: Payment;
  recurrence?: Recurrence;
  services: Service[];
  start: string;
  status?: AppointmentStatus;
  title?: string;
}

export type BigCalendarAppointment = {
  appointmentType: 'appointment' | 'blockout';
  bookedBy?: 'customer' | 'guest';
  cancelledAt?: string;
  customer?: User;
  customerNotes?: string;
  end: Date;
  guestCustomer?: GuestCustomer;
  host: Host;
  hostId: string;
  id: string;
  internalNotes?: string;
  services: Service[];
  start: Date;
  status?: AppointmentStatus;
  title?: string;
};

export interface BaseUser {
  createdAt: string;
  firstName?: null | string;
  id: string;
  lastName?: null | string;
  updatedAt: string;
}

export interface User extends BaseUser {
  adminTitle?: string;
  appointments?: {
    docs: Appointment[];
    hasNextPage: boolean;
  };
  email?: string;
  preferredNameAppointments?: null | string;
  roles?: ('admin' | 'customer') | null;
  takingAppointments?: boolean | null;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TeamMemberDayHours = {
  end?: string | null;
  isWorking?: boolean;
  start?: string | null;
};

export type TeamMemberCustomHours = {
  [key in DayOfWeek]?: TeamMemberDayHours;
};

export interface TeamMember extends BaseUser {
  customHours?: TeamMemberCustomHours;
  icalToken?: string;
  maxAppointmentsPerDay?: number;
  preferredNameAppointments?: null | string;
  takingAppointments?: boolean | null;
  useCustomHours?: boolean;
}

export interface Customer extends BaseUser {
  email: string;
}

export interface Service {
  bufferTime?: number;
  depositAmount?: number;
  depositType?: 'full' | 'fixed' | 'percentage';
  description: null | string;
  duration: number;
  id: string;
  maxAdvanceBooking?: number;
  minLeadTime?: number;
  paidService?: boolean;
  paymentRequired?: boolean;
  price?: number;
  title: string;
}

export type PaymentStatus =
  | 'not-required'
  | 'pending'
  | 'deposit-paid'
  | 'paid'
  | 'refunded'
  | 'partial-refund';

export interface Payment {
  amountDue?: number;
  amountPaid?: number;
  externalPaymentId?: string;
  /** Hosted checkout / payment page URL returned by the provider, if any. */
  paymentUrl?: string;
  paidAt?: string;
  status: PaymentStatus;
}

export interface PaymentHookContext {
  /** ISO 4217 currency code resolved from plugin config (e.g. 'USD', 'INR'). */
  currency: string;
  /** Free-form provider id passed through from plugin config (e.g. 'stripe'). */
  paymentProvider?: string;
}

export type PaymentHooks = {
  /**
   * Invoked when an appointment is created with `payment.status === 'pending'`
   * and no external payment id yet. Return a hosted payment URL + provider
   * payment id; the plugin will persist them on `appointment.payment`.
   */
  onPaymentRequired?: (
    appointment: Appointment,
    ctx: PaymentHookContext,
  ) => Promise<{
    paymentUrl: string;
    paymentId: string;
  }>;
  onPaymentReceived?: (appointment: Appointment, paymentData: unknown) => Promise<void>;
  onRefundRequested?: (appointment: Appointment) => Promise<void>;
};

export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

export type RecurrenceEndType = 'occurrences' | 'endDate';

export interface Recurrence {
  endDate?: string;
  endType?: RecurrenceEndType;
  isRecurring: boolean;
  occurrences?: number;
  pattern?: RecurrencePattern;
  seriesId?: string;
}

export type WaitlistStatus = 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled';

export interface WaitlistEntry {
  createdAt: string;
  customer?: User;
  expiresAt?: string;
  guestCustomer?: GuestCustomer;
  host?: TeamMember;
  id: string;
  notes?: string;
  notifiedAt?: string;
  preferredDates?: { date: string }[];
  preferredTimeRange?: {
    start?: string;
    end?: string;
  };
  service: Service;
  status: WaitlistStatus;
  updatedAt: string;
}

export type SentEmailType = 'created' | 'updated' | 'cancelled';

export interface SentEmail {
  appointment?: Appointment | string;
  createdAt: string;
  emailType: SentEmailType;
  from: string;
  html?: string;
  id: string;
  sentAt: string;
  subject: string;
  text?: string;
  to: string;
  updatedAt: string;
}
