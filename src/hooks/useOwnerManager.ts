/**
 * Custom hook for managing opportunity owner changes using React Query mutations
 * Provides automatic loading states, error handling, and optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface UseOwnerManagerProps {
  opportunityId: string
  onUpdateSuccess: () => void | Promise<void>
}

export function useOwnerManager({
  opportunityId,
  onUpdateSuccess
}: UseOwnerManagerProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (newOwnerId: string) => {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: newOwnerId || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update owner')
      }

      return response.json()
    },
    onMutate: async (newOwnerId) => {
      const toastId = toast.loading('Updating owner...')

      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['opportunity', opportunityId] })

      // Snapshot the previous value
      const previousOpportunity = queryClient.getQueryData(['opportunity', opportunityId])

      // Optimistically update the cache
      queryClient.setQueryData(['opportunity', opportunityId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          owner_id: newOwnerId || null
        }
      })

      return { previousOpportunity, toastId }
    },
    onSuccess: async (data, variables, context) => {
      await onUpdateSuccess()
      toast.success('Owner updated successfully', { id: context.toastId as string })
    },
    onError: (error, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousOpportunity) {
        queryClient.setQueryData(['opportunity', opportunityId], context.previousOpportunity)
      }
      console.error('Error updating owner:', error)
      toast.error('Failed to update owner', { id: context?.toastId as string })
    },
    onSettled: () => {
      // Refetch to ensure we're in sync with server
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    }
  })

  return {
    isUpdating: mutation.isPending,
    updateOwner: mutation.mutate
  }
}
