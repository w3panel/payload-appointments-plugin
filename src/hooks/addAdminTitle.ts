import type { FieldHook } from 'payload'

import type { AppointmentsBuildConfig } from '../types/config'
import { DEFAULT_BUILD_CONFIG } from '../types/config'

export const buildAddAdminTitle = (config: AppointmentsBuildConfig): FieldHook => {
  return async ({ req, siblingData }) => {
    if (siblingData.appointmentType === 'appointment' && siblingData.bookedBy === 'customer') {
      const customer = (
        await req.payload.find({
          collection: config.customerSlug as 'users',
          where: {
            id: {
              equals: siblingData.customer,
            },
          },
        })
      ).docs

      const first = (customer[0] as { firstName?: string } | undefined)?.firstName ?? ''
      const last = (customer[0] as { lastName?: string } | undefined)?.lastName ?? ''
      return `${first} ${last}`.trim() || 'Customer'
    } else if (siblingData.appointmentType === 'appointment' && siblingData.bookedBy === 'guest') {
      const guest = (
        await req.payload.find({
          collection: config.guestCustomerSlug as 'guestCustomers',
          where: {
            id: {
              equals: siblingData.guestCustomer,
            },
          },
        })
      ).docs

      const first = (guest[0] as { firstName?: string } | undefined)?.firstName ?? ''
      const last = (guest[0] as { lastName?: string } | undefined)?.lastName ?? ''
      return `${first} ${last}`.trim() || 'Guest'
    } else if (siblingData.appointmentType === 'blockout') {
      return null
    }
  }
}

/** Backwards-compatible default export bound to the default slugs. */
export const addAdminTitle: FieldHook = buildAddAdminTitle(DEFAULT_BUILD_CONFIG)
