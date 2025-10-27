import { useQuery } from '@tanstack/react-query'

/**
 * Fetches all users in the tenant
 */
async function fetchUsers(): Promise<any[]> {
  const response = await fetch('/api/users')
  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }
  return response.json()
}

/**
 * Fetches users with React Query
 * Users are cached for longer as they don't change frequently
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}
