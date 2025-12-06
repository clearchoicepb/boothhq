import { useQuery } from '@tanstack/react-query'
import type { Event } from '@/types/events'

async function fetchEvents(): Promise<Event[]> {
  const response = await fetch('/api/events?status=all&type=all')
  if (!response.ok) {
    throw new Error('Failed to fetch events')
  }
  const data = await response.json()
  // Handle both array and object structures
  return Array.isArray(data) ? data : (data.events || [])
}

/**
 * Fetches all events with automatic caching and background refetching
 */
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}
