/**
 * Inline Edit Select Component
 * For editing dropdown/select fields (status, payment status, etc.)
 *
 * Follows same pattern as InlineEditField but with select dropdown
 */

'use client'

import { useState } from 'react'
import { Edit2, Check, X, Loader2, ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  color?: string | null
}

interface InlineEditSelectProps {
  label: string
  value: string | null
  options: SelectOption[]
  placeholder?: string
  isEditing: boolean
  isLoading?: boolean
  canEdit: boolean
  onStartEdit: () => void
  onSave: (value: string) => Promise<void>
  onCancel: () => void
  className?: string
  renderDisplay?: (option: SelectOption | null) => React.ReactNode // Custom display renderer
}

export function InlineEditSelect({
  label,
  value,
  options,
  placeholder = 'Not set',
  isEditing,
  isLoading = false,
  canEdit,
  onStartEdit,
  onSave,
  onCancel,
  className = '',
  renderDisplay
}: InlineEditSelectProps) {
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

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-medium text-gray-500">{label}</label>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 pr-10 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900 appearance-none"
              disabled={isLoading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            >
              <option value="">-- Select --</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

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
          <div className="text-sm text-gray-900">
            {renderDisplay ? (
              renderDisplay(selectedOption || null)
            ) : selectedOption ? (
              <span>{selectedOption.label}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
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
