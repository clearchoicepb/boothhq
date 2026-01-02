'use client'

import { useRouter, useParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  ListChecks,
  TicketCheck,
  X,
  Bell,
} from 'lucide-react'
import { useMarkAsRead, useDeleteNotification, type Notification } from '@/hooks/useNotifications'

interface NotificationItemProps {
  notification: Notification
  onClose: () => void
}

/**
 * Icons for each notification type
 */
const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  form_completed: FileCheck,
  proof_approved: CheckCircle2,
  proof_rejected: XCircle,
  subtask_completed: ListChecks,
  ticket_resolved: TicketCheck,
}

/**
 * Color classes for each notification type
 */
const typeColors: Record<string, string> = {
  form_completed: 'text-blue-500 bg-blue-50',
  proof_approved: 'text-green-500 bg-green-50',
  proof_rejected: 'text-red-500 bg-red-50',
  subtask_completed: 'text-purple-500 bg-purple-50',
  ticket_resolved: 'text-teal-500 bg-teal-50',
}

/**
 * Single notification item in the dropdown
 */
export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params?.tenant as string
  const markAsRead = useMarkAsRead()
  const deleteNotification = useDeleteNotification()

  const Icon = typeIcons[notification.type] || Bell
  const colorClass = typeColors[notification.type] || 'text-gray-500 bg-gray-50'

  const handleClick = () => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }

    // Navigate if link exists
    if (notification.link_url) {
      // If link is relative (starts with /), prepend tenant subdomain
      const url = notification.link_url.startsWith('/') && tenantSubdomain
        ? `/${tenantSubdomain}${notification.link_url}`
        : notification.link_url
      router.push(url)
      onClose()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification.mutate(notification.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 px-4 py-3 border-b border-gray-50
        hover:bg-gray-50 cursor-pointer transition-colors group
        ${!notification.is_read ? 'bg-blue-50/30' : ''}
      `}
    >
      {/* Icon */}
      <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${!notification.is_read ? 'font-medium' : ''} text-gray-900 truncate`}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{notification.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          {notification.actor_name && ` · ${notification.actor_name}`}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="w-2 h-2 bg-[#347dc4] rounded-full flex-shrink-0 mt-2" />
      )}

      {/* Delete button (shows on hover) */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
        aria-label="Delete notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
