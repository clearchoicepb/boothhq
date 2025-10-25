/**
 * Custom hook for managing opportunity owner changes
 * Encapsulates owner update logic with loading state
 */

import { useState } from 'react'
import toast from 'react-hot-toast'

interface UseOwnerManagerProps {
  opportunityId: string
  onUpdateSuccess: () => void
}

export function useOwnerManager({
  opportunityId,
  onUpdateSuccess
}: UseOwnerManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateOwner = async (newOwnerId: string) => {
    const toastId = toast.loading('Updating owner...')
    setIsUpdating(true)

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: newOwnerId || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update owner')
      }

      toast.success('Owner updated successfully', { id: toastId })
      onUpdateSuccess()
    } catch (error) {
      console.error('Error updating owner:', error)
      toast.error('Failed to update owner', { id: toastId })
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    isUpdating,
    updateOwner
  }
}
