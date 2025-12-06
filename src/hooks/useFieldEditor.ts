/**
 * Generic hook for inline field editing using React Query mutations
 * Reusable for any editable field with save/cancel and automatic loading states
 */

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

interface UseFieldEditorProps<T> {
  initialValue: T
  onSave: (value: T) => Promise<void>
}

export function useFieldEditor<T>({ initialValue, onSave }: UseFieldEditorProps<T>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState<T>(initialValue)

  // React Query mutation for save operation
  const mutation = useMutation({
    mutationFn: (value: T) => onSave(value),
    onSuccess: () => {
      setIsEditing(false)
      toast.success('Saved successfully')
    },
    onError: (error) => {
      log.error({ error }, 'Error saving')
      toast.error('Failed to save changes')
    }
  })

  // Sync editedValue with initialValue when data updates (but only when NOT editing)
  useEffect(() => {
    if (!isEditing) {
      setEditedValue(initialValue)
    }
  }, [initialValue, isEditing])

  const startEdit = () => {
    setEditedValue(initialValue)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setEditedValue(initialValue)
    setIsEditing(false)
  }

  const saveEdit = () => {
    mutation.mutate(editedValue)
  }

  return {
    isEditing,
    editedValue,
    isSaving: mutation.isPending,
    setEditedValue,
    startEdit,
    cancelEdit,
    saveEdit
  }
}
