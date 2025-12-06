import { useQuery } from '@tanstack/react-query'
import type { EventDate } from '@/types/events'

interface TaskCompletion {
  event_id: string
  core_task_template_id: string
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
}

interface Event {
  id: string
  title: string
  event_type: string
  start_date: string
  end_date: string | null
  date_type: string | null
  status: string
  location: string | null
  account_name: string | null
  contact_name: string | null
  event_dates?: EventDate[]
  created_at: string
  core_tasks_ready?: boolean
  task_completions?: TaskCompletion[]
  event_categories?: {
    id: string
    name: string
    slug: string
    color: string
    icon: string | null
  }
  event_types?: {
    id: string
    name: string
    slug: string
  }
}

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
