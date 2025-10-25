/**
 * React Query configuration and QueryClient setup
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Create a QueryClient instance with sensible defaults
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: How long data is considered fresh (30 seconds)
        staleTime: 30 * 1000,

        // Cache time: How long inactive data stays in cache (5 minutes)
        gcTime: 5 * 60 * 1000,

        // Retry failed requests 3 times with exponential backoff
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus for data freshness
        refetchOnWindowFocus: true,

        // Refetch on reconnect
        refetchOnReconnect: true,

        // Don't refetch on mount if data is still fresh
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations once on network errors
        retry: 1,
        retryDelay: 1000,
      },
    },
  })
}

// Create a singleton instance for the entire app
export const queryClient = createQueryClient()
