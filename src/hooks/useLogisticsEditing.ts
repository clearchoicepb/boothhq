/**
 * useLogisticsEditing Hook
 *
 * Manages editing state and mutations for event logistics.
 * Handles location editing and inline field updates.
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LogisticsLocation } from '@/types/logistics'
import { createLogger } from '@/lib/logger'

const log = createLogger('useLogisticsEditing')

export interface UseLogisticsEditingOptions {
  eventId: string
}

export interface UseLogisticsEditingReturn {
  // Location editing state
  isEditingLocation: boolean
  editedLocationId: string | null
  savingLocation: boolean
  // Location editing handlers
  handleEditLocation: () => void
  handleSaveLocation: (locationId: string | null, location?: LogisticsLocation) => Promise<void>
  handleCancelEditLocation: () => void
  // Query invalidation helper
  invalidateLogistics: () => void
}

/**
 * Hook for managing logistics editing operations
 *
 * @param options - Hook options including eventId
 * @returns Editing state and handlers
 */
export function useLogisticsEditing(
  options: UseLogisticsEditingOptions
): UseLogisticsEditingReturn {
  const { eventId } = options
  const queryClient = useQueryClient()

  // Location editing state
  const [isEditingLocation, setIsEditingLocation] = useState(false)
  const [editedLocationId, setEditedLocationId] = useState<string | null>(null)
  const [savingLocation, setSavingLocation] = useState(false)

  // Helper to invalidate logistics data (triggers refetch)
  const invalidateLogistics = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['event-logistics', eventId] })
  }, [queryClient, eventId])

  // Start editing location
  const handleEditLocation = useCallback(() => {
    setIsEditingLocation(true)
  }, [])

  // Cancel location editing
  const handleCancelEditLocation = useCallback(() => {
    setIsEditingLocation(false)
    setEditedLocationId(null)
  }, [])

  // Save location (updates both events.location and event_dates.location_id)
  const handleSaveLocation = useCallback(async (
    locationId: string | null,
    location?: LogisticsLocation
  ) => {
    setSavingLocation(true)
    setEditedLocationId(locationId)

    try {
      // Update events table with location name
      const locationName = location?.name || ''

      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locationName
        })
      })

      if (res.ok) {
        // Now update the event_dates table with location_id
        // We need to get the event date ID first
        const eventDatesRes = await fetch(`/api/event-dates?event_id=${eventId}`)
        if (eventDatesRes.ok) {
          const eventDates = await eventDatesRes.json()
          if (eventDates && eventDates.length > 0) {
            const primaryEventDate = eventDates[0]

            // Update the location_id in event_dates
            await fetch(`/api/event-dates/${primaryEventDate.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location_id: locationId })
            })
          }
        }

        // Refresh logistics data
        invalidateLogistics()
        setIsEditingLocation(false)
      }
    } catch (error) {
      log.error({ error }, 'Error saving location')
    } finally {
      setSavingLocation(false)
    }
  }, [eventId, invalidateLogistics])

  return {
    // Location editing state
    isEditingLocation,
    editedLocationId,
    savingLocation,
    // Location editing handlers
    handleEditLocation,
    handleSaveLocation,
    handleCancelEditLocation,
    // Query invalidation helper
    invalidateLogistics
  }
}
