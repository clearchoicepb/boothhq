import { useQuery } from '@tanstack/react-query'

interface Event {
  id: string
  name: string
  event_type: string
  event_date: string
  status: string
  total_cost: number | null
}

async function fetchAccountEvents(accountId: string, type: 'upcoming' | 'previous'): Promise<Event[]> {
  const response = await fetch(`/api/accounts/${accountId}/events?type=${type}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${type} events`)
  }
  const data = await response.json()
  return data || []
}

/**
 * Fetches upcoming events for an account
 */
export function useAccountUpcomingEvents(accountId: string) {
  return useQuery({
    queryKey: ['account-events', accountId, 'upcoming'],
    queryFn: () => fetchAccountEvents(accountId, 'upcoming'),
    staleTime: 60 * 1000,
    enabled: Boolean(accountId),
  })
}

/**
 * Fetches previous events for an account
 */
export function useAccountPreviousEvents(accountId: string) {
  return useQuery({
    queryKey: ['account-events', accountId, 'previous'],
    queryFn: () => fetchAccountEvents(accountId, 'previous'),
    staleTime: 60 * 1000,
    enabled: Boolean(accountId),
  })
}
