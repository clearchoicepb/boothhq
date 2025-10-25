/**
 * Custom hook for initializing opportunity form from existing data
 * Handles the complex logic of converting DB opportunity to form state
 */

import { useEffect } from 'react'

interface EventDate {
  id?: string
  event_date: string
  start_time: string
  end_time: string
  location_id?: string
  notes?: string
}

interface UseOpportunityFormInitializerProps {
  opportunity?: any
  setFormData: (data: any) => void
  setEventDates: (dates: EventDate[]) => void
  setSharedLocationId: (locationId: string) => void
}

export function useOpportunityFormInitializer({
  opportunity,
  setFormData,
  setEventDates,
  setSharedLocationId
}: UseOpportunityFormInitializerProps) {
  useEffect(() => {
    if (!opportunity) return

    // Convert DB date_type to form date_type
    let formDateType = 'single_day'
    if (opportunity.date_type === 'single') {
      formDateType = 'single_day'
    } else if (opportunity.date_type === 'multiple') {
      // Infer the specific multiple type from event_dates
      if (opportunity.event_dates && opportunity.event_dates.length > 0) {
        const locations = opportunity.event_dates.map((d: any) => d.location_id).filter((l: any) => l)
        const uniqueLocations = new Set(locations)

        if (uniqueLocations.size > 1) {
          formDateType = 'multiple_locations'
        } else if (uniqueLocations.size === 1) {
          // Same location - check if sequential
          const dates = opportunity.event_dates
            .map((d: any) => new Date(d.event_date))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime())

          // Check if dates are sequential (no gaps)
          let isSequential = true
          for (let i = 1; i < dates.length; i++) {
            const diffDays = Math.floor((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays > 1) {
              isSequential = false
              break
            }
          }

          formDateType = isSequential ? 'same_location_sequential' : 'same_location_non_sequential'
        } else {
          formDateType = 'same_location_non_sequential'
        }
      } else {
        formDateType = 'same_location_non_sequential'
      }
    }

    setFormData({
      name: opportunity.name || '',
      description: opportunity.description || '',
      amount: opportunity.amount?.toString() || '',
      stage: opportunity.stage || 'prospecting',
      probability: opportunity.probability || 50,
      expected_close_date: opportunity.expected_close_date || '',
      actual_close_date: opportunity.actual_close_date || '',
      event_type: opportunity.event_type || '',
      date_type: formDateType
    })

    // If opportunity has event dates, populate them
    if (opportunity.event_dates && opportunity.event_dates.length > 0) {
      const eventDates = opportunity.event_dates.map((date: any) => ({
        id: date.id,
        event_date: date.event_date || '',
        start_time: date.start_time || '',
        end_time: date.end_time || '',
        location_id: date.location_id || '',
        notes: date.notes || ''
      }))
      setEventDates(eventDates)

      // Set shared location if all dates have the same location
      const locations = eventDates.map(d => d.location_id).filter(l => l)
      const uniqueLocations = new Set(locations)
      if (uniqueLocations.size === 1 && locations.length > 0) {
        setSharedLocationId(locations[0])
      }
    }
  }, [opportunity, setFormData, setEventDates, setSharedLocationId])
}
