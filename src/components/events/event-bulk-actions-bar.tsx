'use client'

import { useState } from 'react'
import { X, Trash2, Download, CircleDot, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface EventBulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkDelete: () => void
  onBulkStatusChange: (status: string) => void
  onBulkExport: () => void
}

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' }
]

export function EventBulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport
}: EventBulkActionsBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#347dc4] text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-6">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full px-3 py-1">
            <span className="font-bold">{selectedCount}</span>
          </div>
          <span className="text-sm font-medium">
            {selectedCount === 1 ? 'event selected' : 'events selected'}
          </span>
        </div>

        <div className="h-6 w-px bg-white/30" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Change Status */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors"
            >
              <CircleDot className="h-4 w-4" />
              Change Status
              <ChevronDown className="h-3 w-3" />
            </button>

            {showStatusMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowStatusMenu(false)}
                />
                {/* Status Menu */}
                <div className="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {statusOptions.map(status => (
                    <button
                      key={status.value}
                      onClick={() => {
                        onBulkStatusChange(status.value)
                        setShowStatusMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export */}
          <button
            onClick={onBulkExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          {/* Delete */}
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>

        <div className="h-6 w-px bg-white/30" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="p-2 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
