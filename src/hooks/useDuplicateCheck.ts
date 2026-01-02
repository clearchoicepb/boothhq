'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { DuplicateMatch } from '@/components/merge/DuplicateWarningAlert'

interface UseDuplicateCheckOptions {
  entityType: 'contact' | 'account'
  excludeId?: string  // Exclude current record when editing
  debounceMs?: number
}

interface ContactCheckData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
}

interface AccountCheckData {
  name?: string
  email?: string
  phone?: string
}

export function useDuplicateCheck({
  entityType,
  excludeId,
  debounceMs = 500
}: UseDuplicateCheckOptions) {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const checkDuplicates = useCallback(
    (data: ContactCheckData | AccountCheckData) => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Don't check if no meaningful data
      const hasData = entityType === 'contact'
        ? ((data as ContactCheckData).first_name || (data as ContactCheckData).email || (data as ContactCheckData).phone)
        : ((data as AccountCheckData).name || (data as AccountCheckData).email || (data as AccountCheckData).phone)

      if (!hasData) {
        setDuplicates([])
        setIsChecking(false)
        return
      }

      setIsChecking(true)

      // Debounce the API call
      timeoutRef.current = setTimeout(async () => {
        abortControllerRef.current = new AbortController()

        try {
          const response = await fetch('/api/duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType,
              data,
              excludeId
            }),
            signal: abortControllerRef.current.signal
          })

          if (!response.ok) {
            throw new Error('Failed to check duplicates')
          }

          const result = await response.json()

          // Transform the response to our DuplicateMatch format
          const matches: DuplicateMatch[] = (result.duplicates || []).map((dup: Record<string, unknown>) => ({
            id: entityType === 'contact' ? dup.contact_id : dup.account_id,
            name: entityType === 'contact' ? dup.contact_name : dup.account_name,
            email: entityType === 'contact' ? dup.contact_email : dup.account_email,
            phone: entityType === 'contact' ? dup.contact_phone : dup.account_phone,
            match_score: dup.match_score,
            match_reasons: dup.match_reasons || []
          }))

          setDuplicates(matches)
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            return
          }
          console.error('Duplicate check error:', error)
          setDuplicates([])
        } finally {
          setIsChecking(false)
        }
      }, debounceMs)
    },
    [entityType, excludeId, debounceMs]
  )

  const clearDuplicates = useCallback(() => {
    setDuplicates([])
    setIsChecking(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    duplicates,
    isChecking,
    checkDuplicates,
    clearDuplicates,
    hasDuplicates: duplicates.length > 0
  }
}
