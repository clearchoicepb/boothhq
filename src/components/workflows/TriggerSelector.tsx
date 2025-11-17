'use client'

/**
 * Trigger Selector Component
 *
 * Step 1 of workflow builder
 * Allows selecting multiple event types that trigger the workflow
 * Uses checkboxes for multi-select instead of radio buttons
 */

import { useState, useEffect } from 'react'
import { Calendar, Check, Loader2 } from 'lucide-react'

interface EventType {
  id: string
  name: string
  slug: string
  event_category_id: string
}

interface TriggerSelectorProps {
  selectedEventTypeIds: string[]
  onSelect: (eventTypeIds: string[]) => void
}

export default function TriggerSelector({ selectedEventTypeIds, onSelect }: TriggerSelectorProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEventTypes()
  }, [])

  const fetchEventTypes = async () => {
    try {
      setLoading(true)
      console.log('[TriggerSelector] Fetching event types...')
      const response = await fetch('/api/event-types')
      console.log('[TriggerSelector] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[TriggerSelector] Raw data:', data)
        
        // API returns { eventTypes: [...] }
        const types = data.eventTypes || data
        console.log('[TriggerSelector] Extracted types:', types)
        console.log('[TriggerSelector] Is array?', Array.isArray(types))
        console.log('[TriggerSelector] Count:', types?.length)
        
        // Ensure types is an array
        setEventTypes(Array.isArray(types) ? types : [])
      } else {
        console.error('[TriggerSelector] Response not OK:', await response.text())
      }
    } catch (error) {
      console.error('[TriggerSelector] Error fetching event types:', error)
      setEventTypes([]) // Reset to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (eventTypeId: string) => {
    if (selectedEventTypeIds.includes(eventTypeId)) {
      // Remove from selection
      onSelect(selectedEventTypeIds.filter(id => id !== eventTypeId))
    } else {
      // Add to selection
      onSelect([...selectedEventTypeIds, eventTypeId])
    }
  }

  const isSelected = (eventTypeId: string) => selectedEventTypeIds.includes(eventTypeId)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose Event Type Triggers
        </h3>
        <p className="text-sm text-gray-600">
          Select one or more event types that should trigger this workflow. When an event of any selected type is created, the workflow will automatically execute.
        </p>
        {selectedEventTypeIds.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{selectedEventTypeIds.length}</strong> event type{selectedEventTypeIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#347dc4]" />
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No event types found. Create event types first in Settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventTypes.map((type) => (
            <label
              key={type.id}
              className={`
                relative p-4 rounded-lg border-2 transition-all cursor-pointer
                ${isSelected(type.id)
                  ? 'border-[#347dc4] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected(type.id)}
                  onChange={() => handleToggle(type.id)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#347dc4] focus:ring-[#347dc4] cursor-pointer"
                />
                
                {/* Event Type Info */}
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <Calendar className={`h-4 w-4 mr-2 ${isSelected(type.id) ? 'text-[#347dc4]' : 'text-gray-400'}`} />
                    <div className="font-medium text-gray-900">{type.name}</div>
                  </div>
                </div>

                {/* Checkmark badge when selected */}
                {isSelected(type.id) && (
                  <div className="ml-2 flex-shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#347dc4]">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
