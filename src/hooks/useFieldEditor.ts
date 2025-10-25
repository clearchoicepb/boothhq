/**
 * Generic hook for inline field editing
 * Reusable for any editable field with save/cancel
 */

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface UseFieldEditorProps<T> {
  initialValue: T
  onSave: (value: T) => Promise<void>
}

export function useFieldEditor<T>({ initialValue, onSave }: UseFieldEditorProps<T>) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValue, setEditedValue] = useState<T>(initialValue)
  const [isSaving, setIsSaving] = useState(false)

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

  const saveEdit = async () => {
    setIsSaving(true)
    try {
      await onSave(editedValue)
      setIsEditing(false)
      toast.success('Saved successfully')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    isEditing,
    editedValue,
    isSaving,
    setEditedValue,
    startEdit,
    cancelEdit,
    saveEdit
  }
}
