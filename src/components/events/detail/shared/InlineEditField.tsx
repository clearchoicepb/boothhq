/**
 * Inline Edit Field Component
 * Provides consistent inline editing pattern across the application
 *
 * Pattern:
 * 1. Display mode: Shows value with edit icon (on hover)
 * 2. Edit mode: Shows input with green checkmark (save) + red X (cancel)
 * 3. Loading mode: Shows spinner during save
 * 4. Never auto-saves - always requires explicit save action
 */

'use client'

import { useState } from 'react'
import { Edit2, Check, X, Loader2 } from 'lucide-react'

interface InlineEditFieldProps {
  label: string
  value: string | null
  displayValue?: string // Optional custom display (e.g., formatted date)
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number'
  isEditing: boolean
  isLoading?: boolean
  canEdit: boolean
  onStartEdit: () => void
  onSave: (value: string) => Promise<void>
  onCancel: () => void
  className?: string
  inputClassName?: string
}

export function InlineEditField({
  label,
  value,
  displayValue,
  placeholder = 'Not set',
  type = 'text',
  isEditing,
  isLoading = false,
  canEdit,
  onStartEdit,
  onSave,
  onCancel,
  className = '',
  inputClassName = ''
}: InlineEditFieldProps) {
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
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className={`flex-1 px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900 ${inputClassName}`}
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />

          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <>
              <button
                onClick={handleSave}
                className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors"
                title="Save (Enter)"
                disabled={isLoading}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                title="Cancel (Esc)"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="group flex items-center gap-2">
          <p className="text-sm text-gray-900">
            {displayValue || value || <span className="text-gray-400">{placeholder}</span>}
          </p>
          {canEdit && (
            <button
              onClick={handleStartEdit}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#347dc4] transition-opacity"
              title="Click to edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
