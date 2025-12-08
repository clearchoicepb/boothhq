import { useQuery } from '@tanstack/react-query'
import type {
  OpportunityDrilldownType,
  OpportunityDrilldownResponse
} from '@/app/api/opportunities/drilldown/route'
import type { TimePeriod } from '@/components/ui/kpi-card'

interface UseOpportunitiesDrilldownOptions {
  type: OpportunityDrilldownType | null
  period: TimePeriod
  enabled?: boolean
}

/**
 * Hook to fetch opportunities drilldown data
 * Only fetches when type is not null and enabled is true
 */
export function useOpportunitiesDrilldown({ type, period, enabled = true }: UseOpportunitiesDrilldownOptions) {
  return useQuery<OpportunityDrilldownResponse>({
    queryKey: ['opportunities-drilldown', type, period],
    queryFn: async () => {
      if (!type) throw new Error('Type is required')

      const params = new URLSearchParams({ type })
      // Only add period for types that use it
      if (type !== 'open-pipeline' && type !== 'closing-soon') {
        params.set('period', period)
      }

      const response = await fetch(`/api/opportunities/drilldown?${params}`)
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
  OpportunityDrilldownType,
  OpportunityDrilldownResponse,
  OpportunityDrilldownRecord
} from '@/app/api/opportunities/drilldown/route'
