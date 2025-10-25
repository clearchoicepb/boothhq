/**
 * Custom hook for managing opportunity stage changes using React Query mutations
 * Handles modal delegation for closed stages and provides optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface UseStageManagerProps {
  opportunityId: string
  currentStage: string
  onUpdateSuccess: () => void | Promise<void>
  onShowCloseModal?: (stage: 'closed_won' | 'closed_lost', previousStage: string) => void
}

export function useStageManager({
  opportunityId,
  currentStage,
  onUpdateSuccess,
  onShowCloseModal
}: UseStageManagerProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (newStage: string) => {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      })

      if (!response.ok) {
        throw new Error('Failed to update stage')
      }

      return response.json()
    },
    onMutate: async (newStage) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['opportunity', opportunityId] })

      // Snapshot previous value
      const previousOpportunity = queryClient.getQueryData(['opportunity', opportunityId])

      // Optimistically update the cache
      queryClient.setQueryData(['opportunity', opportunityId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          stage: newStage
        }
      })

      return { previousOpportunity }
    },
    onSuccess: async () => {
      await onUpdateSuccess()
      toast.success('Stage updated successfully')
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOpportunity) {
        queryClient.setQueryData(['opportunity', opportunityId], context.previousOpportunity)
      }
      console.error('Error updating stage:', error)
      toast.error('Failed to update stage')
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    }
  })

  const updateStage = (newStage: string) => {
    // If changing to closed_won or closed_lost, delegate to modal handler
    if ((newStage === 'closed_won' || newStage === 'closed_lost') && onShowCloseModal) {
      onShowCloseModal(newStage, currentStage)
      return
    }

    mutation.mutate(newStage)
  }

  return {
    isUpdating: mutation.isPending,
    updateStage
  }
}
