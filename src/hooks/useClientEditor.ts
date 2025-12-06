/**
 * Custom hook for managing client/account/contact inline editing using React Query mutations
 * Provides automatic loading states, error handling, and optimistic updates
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

interface UseClientEditorProps {
  opportunityId: string
  initialAccountId?: string | null
  initialContactId?: string | null
  onSaveSuccess: () => void | Promise<void>
}

export function useClientEditor({
  opportunityId,
  initialAccountId,
  initialContactId,
  onSaveSuccess
}: UseClientEditorProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editAccountId, setEditAccountId] = useState('')
  const [editContactId, setEditContactId] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: editAccountId || null,
          contact_id: editContactId || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update opportunity')
      }

      return response.json()
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['opportunity', opportunityId] })

      // Snapshot previous value
      const previousOpportunity = queryClient.getQueryData(['opportunity', opportunityId])

      // Optimistically update the cache
      queryClient.setQueryData(['opportunity', opportunityId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          account_id: editAccountId || null,
          contact_id: editContactId || null
        }
      })

      return { previousOpportunity }
    },
    onSuccess: async () => {
      setIsEditing(false)
      await onSaveSuccess()
      toast.success('Client information updated')
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOpportunity) {
        queryClient.setQueryData(['opportunity', opportunityId], context.previousOpportunity)
      }
      log.error({ error }, 'Error updating client')
      toast.error('Failed to update client information')
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] })
    }
  })

  const startEdit = () => {
    setEditAccountId(initialAccountId || '')
    setEditContactId(initialContactId || '')
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setEditAccountId('')
    setEditContactId('')
    setIsEditing(false)
  }

  const saveEdit = () => {
    mutation.mutate()
  }

  return {
    isEditing,
    editAccountId,
    editContactId,
    isSaving: mutation.isPending,
    setEditAccountId,
    setEditContactId,
    startEdit,
    cancelEdit,
    saveEdit
  }
}
