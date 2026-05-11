import type { CollectionBeforeChangeHook } from 'payload'

import { CUSTOM_CONFIG_KEY, DEFAULT_BUILD_CONFIG } from '../types/config'

export const calculatePaymentAmount: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || data.appointmentType !== 'appointment') {
    return data
  }

  if (!data.services || !Array.isArray(data.services) || data.services.length === 0) {
    return data
  }

  if (!data.host) {
    return data
  }

  const hostId = typeof data.host === 'object' ? (data.host as any).id : data.host

  const serviceIds = data.services.map((s: string | { id: string }) =>
    typeof s === 'string' ? s : s.id,
  )

  const resolvedConfig =
    ((req.payload.config as any)?.custom?.[CUSTOM_CONFIG_KEY] as any) ?? DEFAULT_BUILD_CONFIG
  const hostServiceConfigsSlug =
    typeof resolvedConfig?.hostServiceConfigsSlug === 'string'
      ? resolvedConfig.hostServiceConfigsSlug
      : 'hostServiceConfigs'
  const servicesSlug =
    typeof resolvedConfig?.servicesSlug === 'string' ? resolvedConfig.servicesSlug : 'services'

  // Prefer host-specific service configuration when available.
  const hostServiceConfigs = await req.payload.find({
    collection: hostServiceConfigsSlug,
    depth: 0,
    limit: 100,
    where: {
      and: [
        { host: { equals: hostId } },
        { service: { in: serviceIds } },
        { enabled: { equals: true } },
      ],
    },
  })

  // Backwards-compatible fallback: if no host configs are present, use legacy service pricing.
  const shouldFallbackToLegacy = hostServiceConfigs.docs.length === 0

  let serviceSubtotal = 0
  let platformFeeTotal = 0
  let requiresPayment = false
  let firstRequiringPayment: any | null = null

  if (!shouldFallbackToLegacy) {
    for (const cfg of hostServiceConfigs.docs as any[]) {
      if (cfg.paidService && typeof cfg.price === 'number') {
        serviceSubtotal += cfg.price

        const pf = cfg.platformFee
        if (pf?.enabled && typeof pf.feeAmount === 'number') {
          if (pf.feeType === 'percentage') {
            platformFeeTotal += (cfg.price * pf.feeAmount) / 100
          } else {
            platformFeeTotal += pf.feeAmount
          }
        }
      }

      if (cfg.paidService && cfg.paymentRequired) {
        requiresPayment = true
        if (!firstRequiringPayment) firstRequiringPayment = cfg
      }
    }
  } else {
    const services = await req.payload.find({
      collection: servicesSlug,
      depth: 0,
      limit: 100,
      where: {
        id: {
          in: serviceIds,
        },
      },
    })

    for (const service of services.docs as any[]) {
      if (service.paidService && service.price) {
        serviceSubtotal += service.price

        if (service.paymentRequired) {
          requiresPayment = true
          if (!firstRequiringPayment) firstRequiringPayment = service
        }
      }
    }
  }

  const totalPrice = serviceSubtotal + platformFeeTotal

  if (totalPrice > 0) {
    let amountDue = totalPrice

    if (requiresPayment) {
      if (firstRequiringPayment) {
        const depositType = firstRequiringPayment.depositType || 'full'
        const depositAmount = firstRequiringPayment.depositAmount || 0

        switch (depositType) {
          case 'fixed':
            amountDue = Math.min(depositAmount, totalPrice)
            break
          case 'percentage':
            amountDue = (totalPrice * depositAmount) / 100
            break
          default:
            amountDue = totalPrice
        }
      }
    }

    data.payment = {
      status: requiresPayment ? 'pending' : 'not-required',
      amountDue,
      amountPaid: 0,
      externalPaymentId: null,
      paidAt: null,
    }
  }

  return data
}
