'use client'

import React from 'react'

export type InventoryStatus = 'available' | 'long_term_staff' | 'event_checkout' | 'warehouse' | 'assigned'

interface StatusBadgeProps {
  assignmentType?: string | null
  assignedToType?: string | null
  assignedToName?: string | null
  className?: string
}

export function StatusBadge({
  assignmentType,
  assignedToType,
  assignedToName,
  className = ''
}: StatusBadgeProps) {
  // Determine status and styling based on assignment
  const getStatusInfo = (): {
    label: string
    icon: string
    bgColor: string
    textColor: string
    borderColor: string
  } => {
    // If no assignment, it's available
    if (!assignedToType || !assignedToName) {
      return {
        label: 'Available',
        icon: '✓',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      }
    }

    // Check assignment type for specific statuses
    if (assignmentType === 'long_term_staff') {
      return {
        label: 'Long-term Staff',
        icon: '👤',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200'
      }
    }

    if (assignmentType === 'event_checkout') {
      return {
        label: 'Event Checkout',
        icon: '📅',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      }
    }

    if (assignmentType === 'warehouse' || assignedToType === 'physical_address') {
      return {
        label: 'Warehouse',
        icon: '📦',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      }
    }

    // Fallback for generic assignments
    if (assignedToType === 'user') {
      return {
        label: 'Assigned',
        icon: '👤',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
      }
    }

    if (assignedToType === 'product_group') {
      return {
        label: 'In Group',
        icon: '📦',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200'
      }
    }

    // Default to available
    return {
      label: 'Available',
      icon: '✓',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    }
  }

  const status = getStatusInfo()

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bgColor} ${status.textColor} ${status.borderColor} ${className}`}
    >
      <span className="text-sm">{status.icon}</span>
      {status.label}
    </span>
  )
}

// Utility function to get status for filtering/sorting
export function getInventoryStatus(item: {
  assignment_type?: string | null
  assigned_to_type?: string | null
  assigned_to_id?: string | null
}): InventoryStatus {
  if (!item.assigned_to_type || !item.assigned_to_id) {
    return 'available'
  }

  if (item.assignment_type === 'long_term_staff') {
    return 'long_term_staff'
  }

  if (item.assignment_type === 'event_checkout') {
    return 'event_checkout'
  }

  if (item.assignment_type === 'warehouse' || item.assigned_to_type === 'physical_address') {
    return 'warehouse'
  }

  return 'assigned'
}
