'use client'

import { Edit } from 'lucide-react'
import type { LogisticsScheduleProps } from '@/types/logistics'

/**
 * Format time string to 12-hour format
 */
function formatTime(time: string | undefined): string | null {
  if (!time) return null

  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return null

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * LogisticsSchedule Component
 *
 * Displays event schedule with editable load-in time.
 */
export function LogisticsSchedule({
  eventDate,
  setupTime,
  loadInTime,
  startTime,
  endTime,
  loadInTimeEditor
}: LogisticsScheduleProps) {
  return (
    <section className="pb-6 border-b border-gray-300">
      <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">
        Event Schedule
      </h3>

      <div className="space-y-3 pl-4">
        {/* Event Date */}
        {eventDate && (
          <div className="flex">
            <span className="text-sm font-semibold text-gray-700 w-40">Date:</span>
            <span className="text-sm text-gray-900">
              {new Date(eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        )}

        {/* Setup Time (from event dates) */}
        {setupTime && (
          <div className="flex">
            <span className="text-sm font-semibold text-gray-700 w-40">Setup Time:</span>
            <span className="text-sm text-gray-900">{formatTime(setupTime)}</span>
          </div>
        )}

        {/* Load-In Time (event-level field, editable) */}
        <div className="flex">
          <span className="text-sm font-semibold text-gray-700 w-40">Load-In Time:</span>
          {loadInTimeEditor.isEditing ? (
            <div className="flex-1 space-y-2 print:hidden">
              <input
                type="time"
                value={loadInTimeEditor.editedValue}
                onChange={(e) => loadInTimeEditor.setEditedValue(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={loadInTimeEditor.saveEdit}
                  disabled={loadInTimeEditor.isSaving}
                  className="px-3 py-1 bg-[#347dc4] text-white rounded text-xs hover:bg-[#2d6ba8]"
                >
                  {loadInTimeEditor.isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={loadInTimeEditor.cancelEdit}
                  disabled={loadInTimeEditor.isSaving}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900">
                {loadInTime ? formatTime(loadInTime) : 'Not specified'}
              </span>
              <button
                onClick={loadInTimeEditor.startEdit}
                className="text-[#347dc4] hover:text-[#2d6ba8] print:hidden"
              >
                <Edit className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Start Time */}
        {startTime && (
          <div className="flex">
            <span className="text-sm font-semibold text-gray-700 w-40">Start Time:</span>
            <span className="text-sm text-gray-900">{formatTime(startTime)}</span>
          </div>
        )}

        {/* End Time */}
        {endTime && (
          <div className="flex">
            <span className="text-sm font-semibold text-gray-700 w-40">End Time:</span>
            <span className="text-sm text-gray-900">{formatTime(endTime)}</span>
          </div>
        )}
      </div>
    </section>
  )
}
