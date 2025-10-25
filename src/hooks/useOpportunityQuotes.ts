/**
 * React Query hook for opportunity quotes
 */

import { useQuery } from '@tanstack/react-query'

async function fetchQuotes(opportunityId: string) {
  const response = await fetch(`/api/quotes?opportunity_id=${opportunityId}`)
  if (!response.ok) throw new Error('Failed to fetch quotes')
  return response.json()
}

export function useOpportunityQuotes(opportunityId: string) {
  return useQuery({
    queryKey: ['opportunity-quotes', opportunityId],
    queryFn: () => fetchQuotes(opportunityId),
    staleTime: 60 * 1000, // 1 minute
    enabled: Boolean(opportunityId),
  })
}
