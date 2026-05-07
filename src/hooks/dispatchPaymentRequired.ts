import type { CollectionAfterChangeHook } from 'payload'

import type { Appointment, PaymentHooks } from '../types'
import type { AppointmentsBuildConfig } from '../types/config'

/**
 * Generic, provider-agnostic dispatch of `paymentHooks.onPaymentRequired`.
 *
 * Fires when an appointment is created (or transitions into) `payment.status =
 * 'pending'` and there is no `externalPaymentId` yet. The provider decides what
 * to do (e.g. create a Stripe Checkout Session) and returns
 * `{ paymentUrl, paymentId }`, which the plugin persists onto the appointment.
 *
 * Loop guard: when this hook updates the appointment, it sets
 * `context.skipPaymentHooks = true` so the resulting `afterChange` is a no-op.
 */
export const buildDispatchPaymentRequired = (
  config: AppointmentsBuildConfig,
  paymentHooks?: PaymentHooks,
): CollectionAfterChangeHook => {
  return async ({ doc, operation, previousDoc, req, context }) => {
    if (!paymentHooks?.onPaymentRequired) return doc
    if ((context as Record<string, unknown> | undefined)?.skipPaymentHooks) return doc
    if (doc.appointmentType !== 'appointment') return doc

    const payment = (doc.payment || {}) as {
      status?: string
      externalPaymentId?: string | null
    }

    if (payment.status !== 'pending') return doc
    if (payment.externalPaymentId) return doc

    // Only dispatch on transitions into pending without a payment id.
    const previousPayment = (previousDoc?.payment || {}) as {
      status?: string
      externalPaymentId?: string | null
    }
    if (
      operation === 'update' &&
      previousPayment.status === 'pending' &&
      !previousPayment.externalPaymentId
    ) {
      // already attempted previously; let webhook drive the rest
      return doc
    }

    try {
      const result = await paymentHooks.onPaymentRequired(doc as unknown as Appointment, {
        currency: config.currency,
        paymentProvider: config.paymentProvider,
      })

      if (result?.paymentId || result?.paymentUrl) {
        await req.payload.update({
          collection: config.appointmentsSlug as 'appointments',
          id: doc.id,
          context: { skipPaymentHooks: true } as any,
          data: {
            payment: {
              ...(doc.payment as object | undefined),
              externalPaymentId: result.paymentId,
              paymentUrl: result.paymentUrl,
            },
          } as any,
          req,
        })
      }
    } catch (err) {
      req.payload.logger.error(`paymentHooks.onPaymentRequired error: ${err}`)
    }

    return doc
  }
}
