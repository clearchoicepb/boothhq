'use client'

/**
 * React Query Provider Component
 * Wraps the application to provide React Query functionality
 */

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { ReactNode, useState, useEffect } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [showDevtools, setShowDevtools] = useState(false)

  useEffect(() => {
    // Show devtools in development or Vercel preview deployments
    const isVercelPreview = window.location.hostname.includes('vercel.app')
    const isDev = process.env.NODE_ENV === 'development'
    setShowDevtools(isDev || isVercelPreview)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dynamically load React Query Devtools */}
      {showDevtools && <ReactQueryDevtoolsProduction />}
    </QueryClientProvider>
  )
}

// Dynamically import devtools to prevent tree-shaking
function ReactQueryDevtoolsProduction() {
  const [Devtools, setDevtools] = useState<any>(null)

  useEffect(() => {
    import('@tanstack/react-query-devtools').then((mod) => {
      setDevtools(() => mod.ReactQueryDevtools)
    })
  }, [])

  if (!Devtools) return null

  return <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
}
