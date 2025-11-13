import { useMutation, useQueryClient } from '@tanstack/react-query'

export type PrepStatus =
  | 'unassigned'
  | 'needs_prep'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered_to_staff'
  | 'pending_checkin'
  | 'checked_in'

export type CheckinCondition = 'good' | 'damaged' | 'missing'

interface UpdatePrepStatusParams {
  itemId: string
  prep_status: PrepStatus
  old_prep_status?: PrepStatus
  shipping_carrier?: string
  shipping_tracking_number?: string
  shipping_expected_delivery?: string
  checkin_condition?: CheckinCondition
  checkin_notes?: string
}

interface BulkUpdatePrepStatusParams {
  item_ids: string[]
  prep_status: PrepStatus
  shipping_carrier?: string
  shipping_tracking_number?: string
  shipping_expected_delivery?: string
  checkin_condition?: CheckinCondition
  checkin_notes?: string
}

/**
 * Hook to update prep status for a single inventory item
 */
export function useUpdatePrepStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdatePrepStatusParams) => {
      const { itemId, ...body } = params
      const response = await fetch(`/api/inventory-items/${itemId}/prep-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update prep status')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['weekend-prep'] })
    }
  })
}

/**
 * Hook to bulk update prep status for multiple inventory items
 */
export function useBulkUpdatePrepStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: BulkUpdatePrepStatusParams) => {
      const response = await fetch('/api/inventory-items/bulk-prep-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to bulk update prep status')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['weekend-prep'] })
    }
  })
}

/**
 * Helper function to get status display info
 */
export function getStatusDisplayInfo(status: PrepStatus) {
  const statusInfo = {
    needs_gear_assigned: {
      label: 'Needs Gear Assigned',
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      icon: '🔴'
    },
    unassigned: {
      label: 'Unassigned',
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200',
      icon: '⚪'
    },
    needs_prep: {
      label: 'Gear Needs Prepped',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      icon: '🟡'
    },
    ready_for_pickup: {
      label: 'Gear Ready for Pickup',
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      icon: '🟢'
    },
    in_transit: {
      label: 'Gear in Transit',
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      icon: '🔵'
    },
    delivered_to_staff: {
      label: 'Gear Delivered to Staff',
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-800',
      borderColor: 'border-emerald-200',
      icon: '✅'
    },
    pending_checkin: {
      label: 'Pending Check-in',
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-200',
      icon: '🟠'
    },
    checked_in: {
      label: 'Checked In',
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200',
      icon: '✔️'
    }
  }

  return statusInfo[status] || statusInfo.unassigned
}
