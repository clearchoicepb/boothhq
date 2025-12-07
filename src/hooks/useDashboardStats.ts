import { useQuery } from '@tanstack/react-query'
import type { DashboardStatsResponse } from '@/app/api/dashboard/stats/route'

/**
 * Hook to fetch dashboard KPI statistics
 * Uses React Query for caching and automatic refetching
 */
export function useDashboardStats() {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
  })
}

export type { DashboardStatsResponse }
