'use client'

import { Edit } from 'lucide-react'
import { LocationSelect } from '@/components/location-select'
import type { LogisticsVenueProps, LogisticsLocation } from '@/types/logistics'

/**
 * Format a location into a multi-line address string
 */
function formatAddress(location: LogisticsLocation | undefined): string | null {
  if (!location) return null

  const parts: string[] = []

  if (location.address_line1) parts.push(location.address_line1)
  if (location.address_line2) parts.push(location.address_line2)

  const cityStateZip = [
    location.city,
    location.state,
    location.postal_code
  ].filter(Boolean).join(', ')

  if (cityStateZip) parts.push(cityStateZip)
  if (location.country && location.country !== 'US') parts.push(location.country)

  return parts.length > 0 ? parts.join('\n') : null
}

/**
 * LogisticsVenue Component
 *
 * Displays venue information with editable location selection.
 */
export function LogisticsVenue({
  location,
  isEditing,
  editedLocationId,
  savingLocation,
  onEdit,
  onSave,
  onCancel
}: LogisticsVenueProps) {
  return (
    <section className="pb-6 border-b border-gray-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
          Venue Information
        </h3>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#347dc4] hover:underline print:hidden"
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="pl-4 print:hidden">
          <LocationSelect
            value={editedLocationId}
            onChange={onSave}
            label=""
            placeholder="Search or create location..."
            allowCreate={true}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={onCancel}
              disabled={savingLocation}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
          {savingLocation && (
            <p className="text-sm text-gray-500 mt-2">Saving location...</p>
          )}
        </div>
      ) : location ? (
        <div className="pl-4 space-y-3">
          <div className="flex">
            <span className="text-sm font-semibold text-gray-700 w-40">Venue Name:</span>
            <span className="text-sm text-gray-900 font-medium">{location.name}</span>
          </div>

          {formatAddress(location) && (
            <div className="flex">
              <span className="text-sm font-semibold text-gray-700 w-40">Address:</span>
              <span className="text-sm text-gray-900 whitespace-pre-line">
                {formatAddress(location)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="pl-4">
          <p className="text-sm text-gray-500 italic">No venue information specified</p>
        </div>
      )}
    </section>
  )
}
