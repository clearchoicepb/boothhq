import { useQuery } from '@tanstack/react-query'
import { TenantUser, fetchTenantUsers } from '@/lib/users'

/**
 * React Query hook for fetching tenant users
 */
export function useTenantUsers() {
  return useQuery<TenantUser[]>({
    queryKey: ['tenant-users'],
    queryFn: fetchTenantUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
