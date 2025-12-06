'use client'

import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib')

interface FaviconState {
  faviconUrl: string | null
  loading: boolean
  error: string | null
}

interface FaviconResult {
  success: boolean
  faviconUrl?: string
  source?: 'direct' | 'fallback'
  error?: string
}

export function useFavicon(websiteUrl: string | null): FaviconState {
  const [state, setState] = useState<FaviconState>({
    faviconUrl: null,
    loading: false,
    error: null
  })

  useEffect(() => {
    if (!websiteUrl || websiteUrl.trim() === '' || websiteUrl === 'undefined' || websiteUrl === 'null') {
      setState({ faviconUrl: null, loading: false, error: null })
      return
    }

    // Basic URL validation
    try {
      new URL(websiteUrl.trim())
    } catch {
      setState({ faviconUrl: null, loading: false, error: 'Invalid URL' })
      return
    }

    const fetchFavicon = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const response = await fetch('/api/favicon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ websiteUrl: websiteUrl.trim() }),
        })

        const result: FaviconResult = await response.json()

        if (result.success && result.faviconUrl) {
          setState({
            faviconUrl: result.faviconUrl,
            loading: false,
            error: null
          })
        } else {
          setState({
            faviconUrl: null,
            loading: false,
            error: result.error || 'Failed to fetch favicon'
          })
        }
      } catch (error) {
        log.error({ error }, 'Error fetching favicon')
        setState({
          faviconUrl: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Debounce the request
    const timeoutId = setTimeout(fetchFavicon, 500)
    return () => clearTimeout(timeoutId)
  }, [websiteUrl])

  return state
}
