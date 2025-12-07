import { useQuery } from '@tanstack/react-query'
import type {
  DrilldownType,
  DrilldownPeriod,
  DrilldownResponse
} from '@/app/api/dashboard/drilldown/route'

interface UseDashboardDrilldownOptions {
  type: DrilldownType | null
  period: DrilldownPeriod
  enabled?: boolean
}

/**
 * Hook to fetch dashboard drilldown data
 * Only fetches when type is not null and enabled is true
 */
export function useDashboardDrilldown({ type, period, enabled = true }: UseDashboardDrilldownOptions) {
  return useQuery<DrilldownResponse>({
    queryKey: ['dashboard-drilldown', type, period],
    queryFn: async () => {
      if (!type) throw new Error('Type is required')

      const params = new URLSearchParams({ type })
      if (type !== 'total-opportunities') {
        params.set('period', period)
      }

      const response = await fetch(`/api/dashboard/drilldown?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch drilldown data')
      }
      return response.json()
    },
    enabled: enabled && type !== null,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

export type {
  DrilldownType,
  DrilldownPeriod,
  DrilldownResponse,
  EventOccurringRecord,
  EventBookedRecord,
  OpportunityRecord
} from '@/app/api/dashboard/drilldown/route'
