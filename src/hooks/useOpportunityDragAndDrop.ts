import { useState, useCallback } from 'react'
import type { OpportunityWithRelations } from './useOpportunitiesData'

interface UseOpportunityDragAndDropProps {
  opportunities: OpportunityWithRelations[]
  setOpportunities: React.Dispatch<React.SetStateAction<OpportunityWithRelations[]>>
  onShowCloseModal: (opportunity: OpportunityWithRelations, stage: 'closed_won' | 'closed_lost') => void
}

interface UseOpportunityDragAndDropReturn {
  draggedOpportunity: OpportunityWithRelations | null
  dragOverStage: string | null
  showAnimation: 'won' | 'lost' | null
  handleDragStart: (e: React.DragEvent, opportunity: OpportunityWithRelations) => void
  handleDragOver: (e: React.DragEvent, stage: string) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent, newStage: string) => Promise<void>
  handleDragEnd: () => void
  updateOpportunityStage: (
    opportunityId: string,
    newStage: string,
    closeReason?: string,
    closeNotes?: string
  ) => Promise<void>
}

/**
 * Custom hook for managing drag-and-drop functionality for opportunities
 * 
 * @param props - Configuration including opportunities array and callbacks
 * @returns Drag state and event handlers
 */
export function useOpportunityDragAndDrop({
  opportunities,
  setOpportunities,
  onShowCloseModal,
}: UseOpportunityDragAndDropProps): UseOpportunityDragAndDropReturn {
  const [draggedOpportunity, setDraggedOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState<'won' | 'lost' | null>(null)

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, opportunity: OpportunityWithRelations) => {
    setDraggedOpportunity(opportunity)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }, [])

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverStage(null)
  }, [])

  // Update opportunity stage via API
  const updateOpportunityStage = useCallback(async (
    opportunityId: string,
    newStage: string,
    closeReason?: string,
    closeNotes?: string
  ) => {
    try {
      const body: any = { stage: newStage }

      // Include close reason and notes if provided
      if (closeReason !== undefined) {
        body.close_reason = closeReason
      }
      if (closeNotes !== undefined) {
        body.close_notes = closeNotes
      }

      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        // Update local state optimistically
        // Note: setOpportunities is a React Query cache updater, not a state setter
        // We need to pass the updated array directly, not a callback function
        setOpportunities(
          opportunities.map(opp =>
            opp.id === opportunityId
              ? { ...opp, stage: newStage, close_reason: closeReason || opp.close_reason, close_notes: closeNotes || opp.close_notes }
              : opp
          )
        )

        // Show animation for closed buckets
        if (newStage === 'closed_won') {
          setShowAnimation('won')
          setTimeout(() => setShowAnimation(null), 2000)
        } else if (newStage === 'closed_lost') {
          setShowAnimation('lost')
          setTimeout(() => setShowAnimation(null), 2000)
        }
      } else {
        console.error('Failed to update opportunity stage')
        throw new Error('Failed to update opportunity stage')
      }
    } catch (error) {
      console.error('Error updating opportunity stage:', error)
      throw error
    }
  }, [opportunities, setOpportunities])

  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    setDragOverStage(null)

    if (!draggedOpportunity || draggedOpportunity.stage === newStage) {
      setDraggedOpportunity(null)
      return
    }

    // If dropping to closed_won or closed_lost, show the modal
    if (newStage === 'closed_won' || newStage === 'closed_lost') {
      onShowCloseModal(draggedOpportunity, newStage)
      return
    }

    // For non-closed stages, update immediately
    await updateOpportunityStage(draggedOpportunity.id, newStage)
    setDraggedOpportunity(null)
  }, [draggedOpportunity, updateOpportunityStage, onShowCloseModal])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedOpportunity(null)
    setDragOverStage(null)
  }, [])

  return {
    draggedOpportunity,
    dragOverStage,
    showAnimation,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateOpportunityStage,
  }
}

