import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UseUsersOptions {
  includeArchived?: boolean
}

/**
 * Fetches all users in the tenant
 */
async function fetchUsers(includeArchived: boolean = false): Promise<any[]> {
  const url = includeArchived ? '/api/users?include_archived=true' : '/api/users'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }
  return response.json()
}

/**
 * Fetches users with React Query
 * Users are cached for longer as they don't change frequently
 */
export function useUsers(options: UseUsersOptions = {}) {
  const { includeArchived = false } = options

  return useQuery({
    queryKey: ['users', { includeArchived }],
    queryFn: () => fetchUsers(includeArchived),
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

/**
 * Archive a user (soft delete)
 */
export function useArchiveUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to archive user')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all user queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

/**
 * Unarchive a user (restore from soft delete)
 */
export function useUnarchiveUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unarchive' }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unarchive user')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all user queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
