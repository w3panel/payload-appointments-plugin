import type { CollectionAfterChangeHook } from 'payload'

import type { Appointment } from '../types'
import { CUSTOM_CONFIG_KEY } from '../types/config'

import { RenderedEmail as AppointmentCancelledRenderedEmail } from '../emails/AppointmentCancelledEmail'
import { RenderedEmail as AppointmentCreatedRenderedEmail } from '../emails/AppointmentCreatedEmail'
import { RenderedEmail as AppointmentUpdatedRenderedEmail } from '../emails/AppointmentUpdatedEmail'
import { appointmentCancelledEmail } from '../utilities/AppointmentCancelledEmail'
import { appointmentCreatedEmail } from '../utilities/AppointmentCreatedEmail'
import { appointmentUpdatedEmail } from '../utilities/AppointmentUpdatedEmail'

type EmailType = 'created' | 'updated' | 'cancelled'

export const sendCustomerEmail: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (doc.appointmentType !== 'appointment') {
    return
  }

  try {
    const appointment = (await req.payload.findByID({
      id: doc.id,
      collection: 'appointments',
      depth: 2,
      req,
    })) as unknown as Appointment

    const resolved = (req.payload.config as any)?.custom?.[CUSTOM_CONFIG_KEY] as any
    const shouldUseOpeningTimes =
      resolved?.schedulingMode === 'global' || resolved?.fallbackToGlobalOpeningTimes === true

    const timezone = shouldUseOpeningTimes
      ? (((await (req.payload as any).findGlobal({
          slug: resolved?.openingTimesSlug ?? 'openingTimes',
          depth: 0,
          req,
        })) as any)?.timezone as string) || 'UTC'
      : (appointment as any)?.host?.appointments?.timezone || 'UTC'

    let emailData: ReturnType<
      | typeof appointmentCreatedEmail
      | typeof appointmentUpdatedEmail
      | typeof appointmentCancelledEmail
    > | null = null
    let htmlContent: string | null = null
    let emailType: EmailType | null = null

    if (operation === 'create') {
      emailData = appointmentCreatedEmail(appointment)
      htmlContent = await AppointmentCreatedRenderedEmail({
        cancelUrl: 'cancelUrl' in emailData ? emailData.cancelUrl : undefined,
        doc: appointment,
        timezone,
      })
      emailType = 'created'
    } else if (operation === 'update') {
      const wasCancelled = previousDoc?.status !== 'cancelled' && doc.status === 'cancelled'
      if (wasCancelled) {
        emailData = appointmentCancelledEmail(appointment)
        htmlContent = await AppointmentCancelledRenderedEmail({ doc: appointment, timezone })
        emailType = 'cancelled'
      } else if (doc.status !== 'cancelled') {
        emailData = appointmentUpdatedEmail(appointment)
        htmlContent = await AppointmentUpdatedRenderedEmail({
          cancelUrl: 'cancelUrl' in emailData ? emailData.cancelUrl : undefined,
          doc: appointment,
          timezone,
        })
        emailType = 'updated'
      }
    }

    if (emailData && htmlContent && emailType) {
      let emailSent = false

      try {
        await req.payload.sendEmail({
          ...emailData,
          html: htmlContent,
        })
        emailSent = true
      } catch (emailError: unknown) {
        const errorString = String(emailError)
        const errorName = emailError instanceof Error ? emailError.name : ''
        const isNotConfigured =
          errorString.includes('NotFound') ||
          errorString.includes('Not Found') ||
          errorName === 'NotFound'

        if (isNotConfigured) {
          req.payload.logger.warn(
            `Email adapter not configured - skipping ${operation} email notification`,
          )
          emailSent = true
        } else {
          throw emailError
        }
      }

      if (emailSent) {
        try {
          await req.payload.create({
            collection: 'sentEmails',
            data: {
              appointment: doc.id,
              emailType,
              from: emailData.from,
              html: htmlContent,
              sentAt: new Date().toISOString(),
              subject: emailData.subject,
              text: emailData.text,
              to: emailData.to,
            },
            req,
          })
        } catch (logError) {
          req.payload.logger.error(`Error logging sent email: ${logError}`)
        }
      }
    }
  } catch (error) {
    req.payload.logger.error(`Error sending ${operation} email: ${error}`)
  }
}
