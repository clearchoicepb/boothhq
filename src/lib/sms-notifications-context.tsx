'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useTenant } from './tenant-context'

interface SMSMessage {
  id: string
  direction: 'inbound' | 'outbound'
  communication_date: string
}

interface SMSNotificationsContextType {
  unreadCount: number
  lastViewedAt: string | null
  markAsRead: () => void
  refreshUnreadCount: () => Promise<void>
}

const SMSNotificationsContext = createContext<SMSNotificationsContextType | undefined>(undefined)

interface SMSNotificationsProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'sms_last_viewed'

export function SMSNotificationsProvider({ children }: SMSNotificationsProviderProps) {
  const { tenant } = useTenant()
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null)

  // Get storage key that includes tenant ID
  const getStorageKey = useCallback(() => {
    return tenant?.id ? `${STORAGE_KEY}_${tenant.id}` : STORAGE_KEY
  }, [tenant?.id])

  // Load last viewed timestamp from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && tenant?.id) {
      const stored = localStorage.getItem(getStorageKey())
      setLastViewedAt(stored)
    }
  }, [tenant?.id, getStorageKey])

  // Fetch unread count - counts inbound SMS received after lastViewedAt
  const refreshUnreadCount = useCallback(async () => {
    try {
      // Build the query URL
      let url = '/api/communications?communication_type=sms'

      // If we have a lastViewedAt, only fetch messages after that time
      if (lastViewedAt) {
        url += `&since=${encodeURIComponent(lastViewedAt)}`
      }

      const response = await fetch(url)

      if (response.ok) {
        const messages = await response.json()

        // Count only inbound messages (received messages)
        const inboundCount = messages.filter((msg: SMSMessage) => msg.direction === 'inbound').length

        // If no lastViewedAt, set count to 0 (we assume user has seen all messages)
        // unless there are recent messages from the last hour
        if (!lastViewedAt) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
          const recentInbound = messages.filter((msg: SMSMessage) =>
            msg.direction === 'inbound' &&
            new Date(msg.communication_date) > new Date(oneHourAgo)
          ).length
          setUnreadCount(recentInbound)
        } else {
          setUnreadCount(inboundCount)
        }
      }
    } catch (error) {
      console.error('Error fetching SMS unread count:', error)
    }
  }, [lastViewedAt])

  // Initial fetch and polling
  useEffect(() => {
    if (tenant?.id) {
      refreshUnreadCount()

      // Poll every 10 seconds for new messages
      const interval = setInterval(refreshUnreadCount, 10000)
      return () => clearInterval(interval)
    }
  }, [tenant?.id, refreshUnreadCount])

  // Mark all messages as read
  const markAsRead = useCallback(() => {
    const now = new Date().toISOString()
    setLastViewedAt(now)
    setUnreadCount(0)

    if (typeof window !== 'undefined' && tenant?.id) {
      localStorage.setItem(getStorageKey(), now)
    }
  }, [tenant?.id, getStorageKey])

  const value: SMSNotificationsContextType = {
    unreadCount,
    lastViewedAt,
    markAsRead,
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
    // Return a default context instead of throwing an error
    return {
      unreadCount: 0,
      lastViewedAt: null,
      markAsRead: () => {},
      refreshUnreadCount: async () => {},
    }
  }
  return context
}
