'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { useTenant } from './tenant-context'

interface SMSMessage {
  id: string
  direction: 'inbound' | 'outbound'
  communication_date: string
  metadata?: {
    from_number?: string
    to_number?: string
  }
}

// Map of normalized phone number -> last read timestamp
type ThreadReadStatus = Record<string, string>

interface UnreadThread {
  phoneNumber: string
  normalizedPhone: string
  unreadCount: number
  lastMessageDate: string
}

interface SMSNotificationsContextType {
  unreadCount: number
  unreadThreads: UnreadThread[]
  isThreadUnread: (phoneNumber: string) => boolean
  markThreadAsRead: (phoneNumber: string) => void
  refreshUnreadCount: () => Promise<void>
}

const SMSNotificationsContext = createContext<SMSNotificationsContextType | undefined>(undefined)

interface SMSNotificationsProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'sms_thread_read_status'
const INIT_KEY = 'sms_feature_initialized_at'

// Normalize phone number for consistent matching
const normalizePhone = (phone: string) => {
  return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
}

export function SMSNotificationsProvider({ children }: SMSNotificationsProviderProps) {
  const { tenant } = useTenant()
  const [unreadThreads, setUnreadThreads] = useState<UnreadThread[]>([])

  // Use ref to avoid stale closure issues with the read status
  const threadReadStatusRef = useRef<ThreadReadStatus>({})
  const featureInitializedAtRef = useRef<string | null>(null)
  const [statusLoaded, setStatusLoaded] = useState(false)

  // Get storage key that includes tenant ID
  const getStorageKey = useCallback(() => {
    return tenant?.id ? `${STORAGE_KEY}_${tenant.id}` : STORAGE_KEY
  }, [tenant?.id])

  const getInitKey = useCallback(() => {
    return tenant?.id ? `${INIT_KEY}_${tenant.id}` : INIT_KEY
  }, [tenant?.id])

  // Load thread read status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && tenant?.id) {
      console.log('[SMS Notifications] Loading status for tenant:', tenant.id)

      // Load per-thread read status
      const stored = localStorage.getItem(getStorageKey())
      console.log('[SMS Notifications] Stored read status:', stored)
      if (stored) {
        try {
          threadReadStatusRef.current = JSON.parse(stored)
          console.log('[SMS Notifications] Parsed read status:', threadReadStatusRef.current)
        } catch {
          threadReadStatusRef.current = {}
        }
      }

      // Load or set the feature initialization timestamp
      // This marks when the user first started using SMS notifications
      // Only messages AFTER this time will ever be considered "new"
      const initAt = localStorage.getItem(getInitKey())
      console.log('[SMS Notifications] Feature initialized at:', initAt)
      if (initAt) {
        featureInitializedAtRef.current = initAt
      } else {
        // First time - set to now so old messages don't show as unread
        const now = new Date().toISOString()
        featureInitializedAtRef.current = now
        localStorage.setItem(getInitKey(), now)
        console.log('[SMS Notifications] First time init, set to:', now)
      }

      setStatusLoaded(true)
      console.log('[SMS Notifications] Status loaded successfully')
    }
  }, [tenant?.id, getStorageKey, getInitKey])

  // Save thread read status to localStorage
  const saveThreadReadStatus = useCallback(() => {
    if (typeof window !== 'undefined' && tenant?.id) {
      localStorage.setItem(getStorageKey(), JSON.stringify(threadReadStatusRef.current))
    }
  }, [tenant?.id, getStorageKey])

  // Fetch unread count - counts threads with unread inbound messages
  const refreshUnreadCount = useCallback(async () => {
    console.log('[SMS Notifications] refreshUnreadCount called, statusLoaded:', statusLoaded)
    if (!statusLoaded) return

    try {
      const response = await fetch('/api/communications?communication_type=sms')

      if (response.ok) {
        const messages: SMSMessage[] = await response.json()
        const featureInitAt = featureInitializedAtRef.current

        console.log('[SMS Notifications] Fetched messages:', messages.length)
        console.log('[SMS Notifications] Feature init at:', featureInitAt)

        // Only consider messages that arrived AFTER the feature was initialized
        // This prevents old messages from showing as unread
        if (!featureInitAt) {
          console.log('[SMS Notifications] No feature init time, clearing unread')
          setUnreadThreads([])
          return
        }

        // Group inbound messages by phone number
        const threadMessages = new Map<string, { phoneNumber: string; messages: SMSMessage[] }>()

        let inboundCount = 0
        let afterInitCount = 0

        messages.forEach((msg) => {
          // Only count INBOUND messages
          if (msg.direction !== 'inbound') return
          inboundCount++

          // Only count messages that arrived AFTER the feature was initialized
          if (msg.communication_date <= featureInitAt) return
          afterInitCount++

          const phoneNumber = msg.metadata?.from_number
          if (!phoneNumber) return

          const normalized = normalizePhone(phoneNumber)

          if (!threadMessages.has(normalized)) {
            threadMessages.set(normalized, { phoneNumber, messages: [] })
          }
          threadMessages.get(normalized)!.messages.push(msg)
        })

        console.log('[SMS Notifications] Inbound messages:', inboundCount)
        console.log('[SMS Notifications] Messages after init:', afterInitCount)
        console.log('[SMS Notifications] Unique threads with new messages:', threadMessages.size)

        // Calculate unread threads
        const unread: UnreadThread[] = []
        const currentReadStatus = threadReadStatusRef.current

        console.log('[SMS Notifications] Current read status:', JSON.stringify(currentReadStatus))

        threadMessages.forEach(({ phoneNumber, messages: threadMsgs }, normalized) => {
          const lastReadAt = currentReadStatus[normalized]

          // Filter to only messages that haven't been read
          // A message is unread if it arrived AFTER the thread was last read
          const unreadMsgs = lastReadAt
            ? threadMsgs.filter(msg => msg.communication_date > lastReadAt)
            : threadMsgs // If thread never read, all new messages are unread

          console.log('[SMS Notifications] Thread check:', {
            phoneNumber,
            normalized,
            lastReadAt,
            totalMsgsAfterInit: threadMsgs.length,
            unreadMsgs: unreadMsgs.length,
            latestMsgDate: threadMsgs[threadMsgs.length - 1]?.communication_date
          })

          if (unreadMsgs.length > 0) {
            const lastMessageDate = unreadMsgs.reduce((latest, msg) =>
              msg.communication_date > latest ? msg.communication_date : latest
            , unreadMsgs[0].communication_date)

            unread.push({
              phoneNumber,
              normalizedPhone: normalized,
              unreadCount: unreadMsgs.length,
              lastMessageDate
            })
          }
        })

        console.log('[SMS Notifications] Final unread threads:', unread.length, unread)
        setUnreadThreads(unread)
      } else {
        console.error('[SMS Notifications] Failed to fetch messages:', response.status)
      }
    } catch (error) {
      console.error('[SMS Notifications] Error fetching SMS unread count:', error)
    }
  }, [statusLoaded])

  // Initial fetch and polling
  useEffect(() => {
    if (tenant?.id && statusLoaded) {
      refreshUnreadCount()

      // Poll every 10 seconds for new messages
      const interval = setInterval(refreshUnreadCount, 10000)
      return () => clearInterval(interval)
    }
  }, [tenant?.id, statusLoaded, refreshUnreadCount])

  // Check if a specific thread has unread messages
  const isThreadUnread = useCallback((phoneNumber: string) => {
    const normalized = normalizePhone(phoneNumber)
    const isUnread = unreadThreads.some(t => t.normalizedPhone === normalized)
    console.log('[SMS Notifications] isThreadUnread check:', {
      phoneNumber,
      normalized,
      isUnread,
      unreadThreadsCount: unreadThreads.length,
      unreadPhones: unreadThreads.map(t => t.normalizedPhone)
    })
    return isUnread
  }, [unreadThreads])

  // Mark a specific thread as read
  const markThreadAsRead = useCallback((phoneNumber: string) => {
    const normalized = normalizePhone(phoneNumber)
    const now = new Date().toISOString()

    console.log('[SMS Notifications] Marking thread as read:', { phoneNumber, normalized, now })

    // Update the ref immediately
    threadReadStatusRef.current = {
      ...threadReadStatusRef.current,
      [normalized]: now
    }

    // Save to localStorage
    saveThreadReadStatus()

    // Remove this thread from unread list immediately
    setUnreadThreads(prev => {
      const newThreads = prev.filter(t => t.normalizedPhone !== normalized)
      console.log('[SMS Notifications] Updated unread threads:', {
        before: prev.length,
        after: newThreads.length,
        removed: prev.length - newThreads.length
      })
      return newThreads
    })
  }, [saveThreadReadStatus])

  // Total unread count across all threads
  const unreadCount = unreadThreads.reduce((sum, t) => sum + t.unreadCount, 0)

  const value: SMSNotificationsContextType = {
    unreadCount,
    unreadThreads,
    isThreadUnread,
    markThreadAsRead,
    refreshUnreadCount,
  }

  return (
    <SMSNotificationsContext.Provider value={value}>
      {children}
    </SMSNotificationsContext.Provider>
  )
}

export function useSMSNotifications() {
  const context = useContext(SMSNotificationsContext)
  if (context === undefined) {
    return {
      unreadCount: 0,
      unreadThreads: [],
      isThreadUnread: () => false,
      markThreadAsRead: () => {},
      refreshUnreadCount: async () => {},
    }
  }
  return context
}
