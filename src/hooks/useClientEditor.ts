/**
 * Custom hook for managing client/account/contact inline editing using React Query mutations
 * Provides automatic loading states and error handling
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

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
    onSuccess: async () => {
      setIsEditing(false)
      await onSaveSuccess()
      toast.success('Client information updated')
    },
    onError: (error) => {
      console.error('Error updating client:', error)
      toast.error('Failed to update client information')
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
