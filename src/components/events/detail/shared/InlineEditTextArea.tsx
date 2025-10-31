/**
 * Inline Edit TextArea Component
 * For editing longer text content (descriptions, notes, etc.)
 *
 * Follows same pattern as InlineEditField but with textarea
 */

'use client'

import { useState } from 'react'
import { Edit2, Check, X, Loader2 } from 'lucide-react'

interface InlineEditTextAreaProps {
  label: string
  value: string | null
  placeholder?: string
  rows?: number
  isEditing: boolean
  isLoading?: boolean
  canEdit: boolean
  onStartEdit: () => void
  onSave: (value: string) => Promise<void>
  onCancel: () => void
  className?: string
  maxLength?: number
}

export function InlineEditTextArea({
  label,
  value,
  placeholder = 'Not set',
  rows = 4,
  isEditing,
  isLoading = false,
  canEdit,
  onStartEdit,
  onSave,
  onCancel,
  className = '',
  maxLength
}: InlineEditTextAreaProps) {
  const [editValue, setEditValue] = useState(value || '')

  const handleSave = async () => {
    await onSave(editValue)
  }

  const handleCancel = () => {
    setEditValue(value || '')
    onCancel()
  }

  const handleStartEdit = () => {
    setEditValue(value || '')
    onStartEdit()
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-medium text-gray-500">{label}</label>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={rows}
            maxLength={maxLength}
            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900 resize-y"
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              // Ctrl/Cmd + Enter to save
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
              // Escape to cancel
              if (e.key === 'Escape') {
                e.preventDefault()
                handleCancel()
              }
            }}
          />

          <div className="flex items-center justify-between">
            {maxLength && (
              <span className="text-xs text-gray-500">
                {editValue.length} / {maxLength} characters
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors flex items-center gap-1"
                    title="Save (Ctrl+Enter)"
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors flex items-center gap-1"
                    title="Cancel (Esc)"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="group">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-gray-900 whitespace-pre-wrap flex-1">
              {value || <span className="text-gray-400">{placeholder}</span>}
            </p>
            {canEdit && (
              <button
                onClick={handleStartEdit}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#347dc4] transition-opacity flex-shrink-0"
                title="Click to edit"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
