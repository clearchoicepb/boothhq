'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
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

// Normalize phone number for consistent matching
const normalizePhone = (phone: string) => {
  return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
}

export function SMSNotificationsProvider({ children }: SMSNotificationsProviderProps) {
  const { tenant } = useTenant()
  const [unreadThreads, setUnreadThreads] = useState<UnreadThread[]>([])
  const [threadReadStatus, setThreadReadStatus] = useState<ThreadReadStatus>({})

  // Get storage key that includes tenant ID
  const getStorageKey = useCallback(() => {
    return tenant?.id ? `${STORAGE_KEY}_${tenant.id}` : STORAGE_KEY
  }, [tenant?.id])

  // Load thread read status from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && tenant?.id) {
      const stored = localStorage.getItem(getStorageKey())
      if (stored) {
        try {
          setThreadReadStatus(JSON.parse(stored))
        } catch {
          setThreadReadStatus({})
        }
      }
    }
  }, [tenant?.id, getStorageKey])

  // Save thread read status to localStorage
  const saveThreadReadStatus = useCallback((status: ThreadReadStatus) => {
    if (typeof window !== 'undefined' && tenant?.id) {
      localStorage.setItem(getStorageKey(), JSON.stringify(status))
    }
  }, [tenant?.id, getStorageKey])

  // Fetch unread count - counts threads with unread inbound messages
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/communications?communication_type=sms')

      if (response.ok) {
        const messages: SMSMessage[] = await response.json()

        // Group inbound messages by phone number
        const threadMessages = new Map<string, { phoneNumber: string; messages: SMSMessage[] }>()

        messages.forEach((msg) => {
          if (msg.direction !== 'inbound') return

          const phoneNumber = msg.metadata?.from_number
          if (!phoneNumber) return

          const normalized = normalizePhone(phoneNumber)

          if (!threadMessages.has(normalized)) {
            threadMessages.set(normalized, { phoneNumber, messages: [] })
          }
          threadMessages.get(normalized)!.messages.push(msg)
        })

        // Calculate unread threads
        const unread: UnreadThread[] = []

        threadMessages.forEach(({ phoneNumber, messages: threadMsgs }, normalized) => {
          const lastReadAt = threadReadStatus[normalized]

          // Count messages newer than last read time
          const unreadMsgs = lastReadAt
            ? threadMsgs.filter(msg => new Date(msg.communication_date) > new Date(lastReadAt))
            : threadMsgs // If never read, all are unread

          if (unreadMsgs.length > 0) {
            // Find the most recent message date
            const lastMessageDate = unreadMsgs.reduce((latest, msg) =>
              new Date(msg.communication_date) > new Date(latest) ? msg.communication_date : latest
            , unreadMsgs[0].communication_date)

            unread.push({
              phoneNumber,
              normalizedPhone: normalized,
              unreadCount: unreadMsgs.length,
              lastMessageDate
            })
          }
        })

        setUnreadThreads(unread)
      }
    } catch (error) {
      console.error('Error fetching SMS unread count:', error)
    }
  }, [threadReadStatus])

  // Initial fetch and polling
  useEffect(() => {
    if (tenant?.id) {
      refreshUnreadCount()

      // Poll every 10 seconds for new messages
      const interval = setInterval(refreshUnreadCount, 10000)
      return () => clearInterval(interval)
    }
  }, [tenant?.id, refreshUnreadCount])

  // Check if a specific thread has unread messages
  const isThreadUnread = useCallback((phoneNumber: string) => {
    const normalized = normalizePhone(phoneNumber)
    return unreadThreads.some(t => t.normalizedPhone === normalized)
  }, [unreadThreads])

  // Mark a specific thread as read
  const markThreadAsRead = useCallback((phoneNumber: string) => {
    const normalized = normalizePhone(phoneNumber)
    const now = new Date().toISOString()

    const newStatus = {
      ...threadReadStatus,
      [normalized]: now
    }

    setThreadReadStatus(newStatus)
    saveThreadReadStatus(newStatus)

    // Remove this thread from unread list
    setUnreadThreads(prev => prev.filter(t => t.normalizedPhone !== normalized))
  }, [threadReadStatus, saveThreadReadStatus])

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
    // Return a default context instead of throwing an error
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
