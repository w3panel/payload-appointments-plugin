import type { Payload } from 'payload'

import type { AppointmentsBuildConfig } from '../types/config'
import { DEFAULT_BUILD_CONFIG } from '../types/config'

import { openingTimesSeed, servicesSeed, teamMembersSeed } from './data'

export const seedAppointmentsData = async (
  payload: Payload,
  config: AppointmentsBuildConfig = DEFAULT_BUILD_CONFIG,
): Promise<void> => {
  payload.logger.info('Seeding appointments plugin data...')

  try {
    if (config.schedulingMode === 'global' || config.fallbackToGlobalOpeningTimes) {
      await (payload as any).updateGlobal({
        slug: config.openingTimesSlug,
        data: openingTimesSeed,
      })
      payload.logger.info('Seeded opening times')
    }

    const existingServices = await payload.find({
      collection: config.servicesSlug as 'services',
      limit: 1,
    })

    if (existingServices.totalDocs === 0) {
      for (const service of servicesSeed) {
        await payload.create({
          collection: config.servicesSlug as 'services',
          data: service,
        })
      }
      payload.logger.info(`Seeded ${servicesSeed.length} services`)
    } else {
      payload.logger.info('Services already exist, skipping...')
    }

    // Only seed team members when caller is using the built-in TeamMembers
    // collection. When a host slug is overridden (e.g. "doctors"), the host
    // documents are owned by the consumer and we must not create them here.
    if (config.hostSlug === DEFAULT_BUILD_CONFIG.hostSlug) {
      const existingTeamMembers = await payload.find({
        collection: config.hostSlug as any,
        limit: 1,
      })

      if (existingTeamMembers.totalDocs === 0) {
        for (const teamMember of teamMembersSeed) {
          await payload.create({
            collection: config.hostSlug as any,
            data: teamMember,
          })
        }
        payload.logger.info(`Seeded ${teamMembersSeed.length} team members`)
      } else {
        payload.logger.info('Team members already exist, skipping...')
      }
    } else {
      payload.logger.info(
        `Host collection overridden to "${config.hostSlug}" — skipping team member seed`,
      )
    }

    payload.logger.info('Appointments plugin data seeding complete!')
  } catch (error) {
    payload.logger.error(`Error seeding appointments data: ${error}`)
  }
}
