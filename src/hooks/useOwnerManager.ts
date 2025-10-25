/**
 * Custom hook for managing opportunity owner changes using React Query mutations
 * Provides automatic loading states and error handling
 */

import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface UseOwnerManagerProps {
  opportunityId: string
  onUpdateSuccess: () => void | Promise<void>
}

export function useOwnerManager({
  opportunityId,
  onUpdateSuccess
}: UseOwnerManagerProps) {
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
    onMutate: () => {
      return toast.loading('Updating owner...')
    },
    onSuccess: async (data, variables, toastId) => {
      await onUpdateSuccess()
      toast.success('Owner updated successfully', { id: toastId as string })
    },
    onError: (error, variables, toastId) => {
      console.error('Error updating owner:', error)
      toast.error('Failed to update owner', { id: toastId as string })
    }
  })

  return {
    isUpdating: mutation.isPending,
    updateOwner: mutation.mutate
  }
}
