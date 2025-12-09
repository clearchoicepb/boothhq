'use client'

import { Edit } from 'lucide-react'
import type { LogisticsLoadInProps } from '@/types/logistics'

/**
 * LogisticsLoadIn Component
 *
 * Displays load-in details with editable operations notes.
 */
export function LogisticsLoadIn({
  loadInNotes,
  locationNotes,
  notesEditor
}: LogisticsLoadInProps) {
  return (
    <section className="pb-6 border-b border-gray-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
          Load-In Details
        </h3>
        {!notesEditor.isEditing && (
          <button
            onClick={notesEditor.startEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#347dc4] hover:underline print:hidden"
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      <div className="pl-4 space-y-4">
        {notesEditor.isEditing ? (
          <div className="space-y-3 print:hidden">
            <label className="block text-sm font-semibold text-gray-700">
              Operations Notes:
            </label>
            <textarea
              value={notesEditor.editedValue}
              onChange={(e) => notesEditor.setEditedValue(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="Examples: See security upon arrival, Call onsite POC, parking instructions, etc."
            />
            <div className="flex gap-2">
              <button
                onClick={notesEditor.saveEdit}
                disabled={notesEditor.isSaving}
                className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
              >
                {notesEditor.isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={notesEditor.cancelEdit}
                disabled={notesEditor.isSaving}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <span className="text-sm font-semibold text-gray-700 block mb-2">
              Operations Notes:
            </span>
            <p className="text-sm text-gray-900 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
              {loadInNotes || (
                <span className="text-gray-500 italic">No load-in notes specified</span>
              )}
            </p>
          </div>
        )}

        {/* Parking/Load-In Instructions from Location */}
        {locationNotes && (
          <div className="pt-3 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700 block mb-2">
              Venue Parking & Load-In Instructions:
            </span>
            <p className="text-sm text-gray-900 whitespace-pre-wrap pl-4 border-l-2 border-gray-300">
              {locationNotes}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
