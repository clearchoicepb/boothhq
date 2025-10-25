import { useQuery } from '@tanstack/react-query'

interface CoreTask {
  id: string
  tenant_id: string
  task_name: string
  display_order: number
  is_active: boolean
}

async function fetchCoreTaskTemplates(): Promise<CoreTask[]> {
  const response = await fetch('/api/core-tasks/templates')
  if (!response.ok) {
    throw new Error('Failed to fetch core task templates')
  }
  const data = await response.json()
  return data.templates || []
}

/**
 * Fetches core task templates with long-term caching (changes infrequently)
 */
export function useCoreTaskTemplates() {
  return useQuery({
    queryKey: ['core-task-templates'],
    queryFn: fetchCoreTaskTemplates,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })
}
