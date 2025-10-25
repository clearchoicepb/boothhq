import { useQuery } from '@tanstack/react-query'

/**
 * Fetches active staff roles
 */
async function fetchStaffRoles(activeOnly: boolean = true): Promise<any[]> {
  const response = await fetch(`/api/staff-roles?active_only=${activeOnly}`)
  if (!response.ok) {
    throw new Error('Failed to fetch staff roles')
  }
  return response.json()
}

/**
 * Fetches staff roles with React Query
 * Staff roles are cached for longer as they don't change frequently
 */
export function useStaffRoles(activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['staff-roles', { activeOnly }],
    queryFn: () => fetchStaffRoles(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes - roles don't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}
