/**
 * Custom hook for managing opportunity stage changes
 * Encapsulates stage update logic with modal handling for closed stages
 */

import { useState } from 'react'
import toast from 'react-hot-toast'

interface UseStageManagerProps {
  opportunityId: string
  currentStage: string
  onUpdateSuccess: () => void
  onShowCloseModal?: (stage: 'closed_won' | 'closed_lost', previousStage: string) => void
}

export function useStageManager({
  opportunityId,
  currentStage,
  onUpdateSuccess,
  onShowCloseModal
}: UseStageManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateStage = async (newStage: string) => {
    // If changing to closed_won or closed_lost, delegate to modal handler
    if ((newStage === 'closed_won' || newStage === 'closed_lost') && onShowCloseModal) {
      onShowCloseModal(newStage, currentStage)
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      toast.success('Stage updated successfully')
      onUpdateSuccess()
    } catch (error) {
      console.error('Error updating stage:', error)
      toast.error('Failed to update stage')
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    isUpdating,
    updateStage
  }
}
