'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TicketStatus } from '@/types/ticket.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('tickets')

interface TicketStatusButtonProps {
  ticketId: string
  currentStatus: TicketStatus
  targetStatus: TicketStatus
  onStatusChange?: (newStatus: TicketStatus) => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
  label?: string
}

/**
 * Reusable button component for changing ticket status.
 * Follows Single Responsibility Principle - only handles status changes.
 * Can be configured for different target statuses (resolved, closed, etc.)
 */
export function TicketStatusButton({
  ticketId,
  currentStatus,
  targetStatus,
  onStatusChange,
  variant = 'outline',
  size = 'sm',
  className = '',
  showIcon = true,
  label,
}: TicketStatusButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  // Don't render if already at target status
  if (currentStatus === targetStatus) {
    return null
  }

  const getDefaultLabel = (): string => {
    switch (targetStatus) {
      case 'resolved':
        return 'Mark Resolved'
      case 'closed':
        return 'Close'
      case 'in_progress':
        return 'Start Progress'
      case 'on_hold':
        return 'Put On Hold'
      case 'new':
        return 'Reopen'
      default:
        return `Set ${targetStatus}`
    }
  }

  const getIcon = () => {
    switch (targetStatus) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const handleStatusChange = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent parent click handlers (e.g., row navigation)

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update ticket status')
      }

      const successMessage = targetStatus === 'resolved'
        ? 'Ticket marked as resolved!'
        : `Ticket status changed to ${targetStatus}`

      toast.success(successMessage)
      onStatusChange?.(targetStatus)
    } catch (error) {
      log.error({ error }, 'Error updating ticket status')
      toast.error('Failed to update ticket status')
    } finally {
      setIsUpdating(false)
    }
  }

  const buttonLabel = label || getDefaultLabel()
  const icon = showIcon ? getIcon() : null

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStatusChange}
      disabled={isUpdating}
      className={`${targetStatus === 'resolved' ? 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200' : ''} ${className}`}
    >
      {isUpdating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {buttonLabel}
        </>
      )}
    </Button>
  )
}
