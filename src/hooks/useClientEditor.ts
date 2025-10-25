/**
 * Custom hook for managing client/account/contact inline editing
 * Encapsulates editing state and save logic
 */

import { useState } from 'react'
import toast from 'react-hot-toast'

interface UseClientEditorProps {
  opportunityId: string
  initialAccountId?: string | null
  initialContactId?: string | null
  onSaveSuccess: () => void
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
  const [isSaving, setIsSaving] = useState(false)

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

  const saveEdit = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: editAccountId || null,
          contact_id: editContactId || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update opportunity')
      }

      toast.success('Client information updated')
      setIsEditing(false)
      onSaveSuccess()
    } catch (error) {
      console.error('Error updating client:', error)
      toast.error('Failed to update client information')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    isEditing,
    editAccountId,
    editContactId,
    isSaving,
    setEditAccountId,
    setEditContactId,
    startEdit,
    cancelEdit,
    saveEdit
  }
}
