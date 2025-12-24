import { useQuery } from '@tanstack/react-query'
import type { AvailableUser } from '@/app/api/users/available/route'
import type { DepartmentId } from '@/lib/departments'

/**
 * Fetches available users for a specific event and department
 */
async function fetchAvailableUsers(
  eventId: string,
  department: DepartmentId
): Promise<AvailableUser[]> {
  const params = new URLSearchParams({
    event_id: eventId,
    department
  })

  const response = await fetch(`/api/users/available?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch available users')
  }

  return response.json()
}

/**
 * Hook to fetch available users for staff assignment
 *
 * Users are sorted with available users first, then users with conflicts.
 * Each user includes conflict information if they're assigned elsewhere on the same dates.
 *
 * @param eventId - The event to check availability for
 * @param department - The department to filter users by
 * @returns Query result with available users
 *
 * @example
 * ```tsx
 * // Fetch operations department users for an event
 * const { data: users, isLoading } = useAvailableUsers(eventId, 'operations')
 *
 * // Render dropdown with conflict warnings
 * users?.map(user => (
 *   <option key={user.id}>
 *     {user.first_name} {user.last_name}
 *     {!user.is_available && ` (${user.conflicts[0]?.event_title})`}
 *   </option>
 * ))
 * ```
 */
export function useAvailableUsers(
  eventId: string | undefined | null,
  department: DepartmentId | undefined | null
) {
  return useQuery({
    queryKey: ['available-users', eventId, department],
    queryFn: () => fetchAvailableUsers(eventId!, department!),
    enabled: Boolean(eventId) && Boolean(department),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}
