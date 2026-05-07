import type { AdminViewProps } from 'payload'

import AnalyticsClient from './index.client'

const AnalyticsView: React.FC<AdminViewProps> = async ({
  initPageResult,
  params,
  searchParams,
}) => {
  return <AnalyticsClient />
}

export default AnalyticsView
