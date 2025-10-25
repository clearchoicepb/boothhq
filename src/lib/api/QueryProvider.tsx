'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

/**
 * React Query Provider with optimized default configuration
 *
 * Features:
 * - 30 second stale time for most queries (prevents excessive refetching)
 * - Automatic background refetching on window focus
 * - Automatic retry on network errors (3 attempts)
 * - DevTools in development mode for debugging
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance once per component mount
  // This ensures queries persist across page navigations
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
