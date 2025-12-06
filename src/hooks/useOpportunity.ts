/**
 * React Query hook for fetching opportunity data
 * Provides automatic caching and background refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { EventDate } from '@/types/events'

export type { EventDate }

export interface Opportunity {
  id: string
  name: string
  description: string | null
  stage: string
  probability: number | null
  amount: number | null
  expected_close_date: string | null
  actual_close_date: string | null
  close_reason: string | null
  close_notes: string | null
  event_type: string | null
  date_type: string | null
  event_date: string | null
  initial_date: string | null
  final_date: string | null
  account_id: string | null
  contact_id: string | null
  lead_id: string | null
  owner_id: string | null
  account_name: string | null
  contact_name: string | null
  event_dates?: EventDate[]
  created_at: string
  updated_at: string
}

async function fetchOpportunity(opportunityId: string): Promise<Opportunity> {
  const response = await fetch(`/api/opportunities/${opportunityId}`)
  if (!response.ok) throw new Error('Failed to fetch opportunity')
  return response.json()
}

export function useOpportunity(opportunityId: string) {
  return useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: () => fetchOpportunity(opportunityId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: Boolean(opportunityId),
  })
}

// Mutation for updating opportunity with optimistic updates
export function useUpdateOpportunity(opportunityId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Opportunity>) => {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update opportunity')
      return response.json()
    },
    // Optimistic update: Update UI immediately before server confirms
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['opportunity', opportunityId] })

      // Snapshot previous value
      const previous = queryClient.getQueryData(['opportunity', opportunityId])

      // Optimistically update to new value
      queryClient.setQueryData(['opportunity', opportunityId], (old: any) => ({
        ...old,
        ...updates
      }))

      return { previous }
    },
    // Rollback on error
    onError: (err, updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['opportunity', opportunityId], context.previous)
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    }
  })
}
