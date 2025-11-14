/**
 * React Query hook for opportunity activities
 */

import { useQuery } from '@tanstack/react-query'

async function fetchActivities(opportunityId: string) {
  const response = await fetch(`/api/opportunities/${opportunityId}/activity`)
  if (!response.ok) throw new Error('Failed to fetch activities')
  return response.json()
}

export function useOpportunityActivities(opportunityId: string) {
  return useQuery({
    queryKey: ['opportunity-activities', opportunityId],
    queryFn: () => fetchActivities(opportunityId),
    staleTime: 0, // Always refetch when invalidated to show latest activities
    enabled: Boolean(opportunityId),
  })
}
