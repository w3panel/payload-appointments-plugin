import type { CollectionBeforeValidateHook } from 'payload'

export const validateCustomerOrGuest: CollectionBeforeValidateHook = async ({ data }) => {
  if (data?.appointmentType === 'blockout') {
    return data
  }

  if (data?.appointmentType === 'appointment') {
    const hasCustomer = !!data?.customer

    if (!hasCustomer) {
      throw new Error('Customer is required for appointments')
    }
  }

  return data
}
