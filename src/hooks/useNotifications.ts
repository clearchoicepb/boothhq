'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Notification type from the API
 */
export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  type: string
  title: string
  message: string | null
  entity_type: string | null
  entity_id: string | null
  link_url: string | null
  is_read: boolean
  read_at: string | null
  actor_name: string | null
  created_at: string
}

/**
 * Response from GET /api/notifications
 */
interface NotificationsResponse {
  notifications: Notification[]
  total: number
  hasMore: boolean
}

/**
 * Centralized query keys for notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

/**
 * Fetch unread notification count
 * Polls every 30 seconds to keep badge updated
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count')
      if (!res.ok) throw new Error('Failed to fetch unread count')
      const data = await res.json()
      return data.count as number
    },
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 10000, // Consider fresh for 10 seconds
    refetchOnWindowFocus: true,
  })
}

/**
 * Fetch notifications list
 * @param limit - Maximum number of notifications to fetch (default: 20)
 * @param enabled - Whether to enable the query (default: true)
 */
export function useNotifications(limit = 20, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const res = await fetch(`/api/notifications?limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json() as Promise<NotificationsResponse>
    },
    staleTime: 30000, // Consider fresh for 30 seconds
    enabled,
  })
}

/**
 * Mark a single notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to mark as read')
      return res.json()
    },
    onSuccess: () => {
      // Invalidate both list and count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

/**
 * Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to mark all as read')
      return res.json()
    },
    onSuccess: () => {
      // Invalidate both list and count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

/**
 * Delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete notification')
      return res.json()
    },
    onSuccess: () => {
      // Invalidate both list and count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
