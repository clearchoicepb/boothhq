import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type { OpportunityWithRelations } from './useOpportunitiesData'

interface UseOpportunitiesListParams {
  stage?: string
  ownerId?: string
  currentView?: 'table' | 'pipeline' | 'cards'
  page?: number
  limit?: number
  enabled?: boolean
}

interface OpportunitiesListResponse {
  data: OpportunityWithRelations[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * React Query hook for fetching paginated opportunities list
 */
export function useOpportunitiesList({
  stage = 'all',
  ownerId,
  currentView = 'table',
  page = 1,
  limit = 25,
  enabled = true
}: UseOpportunitiesListParams = {}) {

  const queryKey = ['opportunities-list', { stage, ownerId, currentView, page, limit }]

  return useQuery<OpportunitiesListResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        stage,
        page: page.toString(),
        limit: limit.toString()
      })

      if (ownerId && ownerId !== 'all') {
        params.append('owner_id', ownerId)
      }

      if (currentView === 'pipeline') {
        params.append('pipelineView', 'true')
      }

      params.append('include_converted', 'true')

      const response = await fetch(`/api/entities/opportunities?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities')
      }

      const result = await response.json()

      // Handle both paginated and non-paginated responses
      if (result.data && result.pagination) {
        return result
      } else {
        // Fallback for non-paginated response
        return {
          data: result,
          pagination: {
            page: 1,
            limit: result.length,
            total: result.length,
            totalPages: 1
          }
        }
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled,
    refetchOnWindowFocus: true, // Preserve the auto-refresh behavior
    refetchOnReconnect: true
  })
}

/**
 * Mutation hook for deleting an opportunity
 */
export function useDeleteOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete opportunity')
      }
      return opportunityId
    },
    onSuccess: (deletedId) => {
      // Invalidate all opportunities list queries to refetch
      queryClient.invalidateQueries({ queryKey: ['opportunities-list'] })

      // Optimistically remove from all cached queries
      queryClient.setQueriesData<OpportunitiesListResponse>(
        { queryKey: ['opportunities-list'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter(opp => opp.id !== deletedId),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1
            }
          }
        }
      )
    }
  })
}
