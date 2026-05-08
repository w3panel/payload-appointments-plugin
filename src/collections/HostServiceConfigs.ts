import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import type { AppointmentsBuildConfig } from '../types/config'

export const buildHostServiceConfigs = (config: AppointmentsBuildConfig): CollectionConfig => ({
  slug: config.hostServiceConfigsSlug,
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['host', 'service', 'enabled', 'price', 'paymentRequired'],
    group: 'Appointments',
    useAsTitle: 'key',
  },
  fields: [
    {
      name: 'host',
      type: 'relationship',
      relationTo: config.hostSlug as any,
      required: true,
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: config.servicesSlug as any,
      required: true,
    },
    {
      name: 'key',
      type: 'text',
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            const hostId = typeof data?.host === 'object' ? data.host?.id : data?.host
            const serviceId = typeof data?.service === 'object' ? data.service?.id : data?.service
            if (hostId && serviceId) return `${hostId}:${serviceId}`
            return value
          },
        ],
      },
      index: true,
      unique: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Service Enabled',
    },
    {
      name: 'price',
      type: 'number',
      admin: {
        description: 'Host-specific price (overrides service catalog pricing).',
      },
      label: 'Price',
      min: 0,
    },
    {
      name: 'paidService',
      type: 'checkbox',
      defaultValue: false,
      label: 'Paid Service',
    },
    {
      name: 'paymentRequired',
      type: 'checkbox',
      admin: {
        condition: (data) => data?.paidService === true,
        description: 'Require payment at time of booking',
      },
      defaultValue: false,
      label: 'Require Payment to Book',
    },
    {
      type: 'row',
      admin: {
        condition: (data) => data?.paidService === true && data?.paymentRequired === true,
      },
      fields: [
        {
          name: 'depositType',
          type: 'select',
          defaultValue: 'full',
          label: 'Deposit Type',
          options: [
            { label: 'Full Payment', value: 'full' },
            { label: 'Fixed Deposit', value: 'fixed' },
            { label: 'Percentage Deposit', value: 'percentage' },
          ],
        },
        {
          name: 'depositAmount',
          type: 'number',
          admin: {
            condition: (data) => data?.depositType !== 'full',
          },
          label: 'Deposit Amount',
          min: 0,
        },
      ],
    },
    {
      name: 'platformFee',
      type: 'group',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
          label: 'Enable Platform Fee',
        },
        {
          type: 'row',
          admin: {
            condition: (_: any, siblingData: any) => siblingData?.enabled === true,
          },
          fields: [
            {
              name: 'feeType',
              type: 'select',
              defaultValue: 'fixed',
              label: 'Fee Type',
              options: [
                { label: 'Fixed', value: 'fixed' },
                { label: 'Percentage', value: 'percentage' },
              ],
            },
            {
              name: 'feeAmount',
              type: 'number',
              label: 'Fee Amount',
              min: 0,
              required: true,
            },
          ],
        },
        {
          name: 'showFeeIncluded',
          type: 'checkbox',
          admin: {
            condition: (_: any, siblingData: any) => siblingData?.enabled === true,
            description: 'If checked, show service price as including platform fee.',
          },
          defaultValue: true,
          label: 'Show Fee Included',
        },
      ],
      label: 'Platform Fee',
    },
  ],
  labels: {
    plural: 'Doctors Service Payment Configs',
    singular: 'Doctors Service Payment Config',
  },
  timestamps: true,
})
