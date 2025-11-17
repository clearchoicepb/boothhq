'use client'

/**
 * Trigger Selector Component
 *
 * Step 1 of workflow builder
 * Allows selecting which event type triggers the workflow
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
  eventTypeId: string | null
  onSelect: (eventTypeId: string) => void
}

export default function TriggerSelector({ eventTypeId, onSelect }: TriggerSelectorProps) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEventTypes()
  }, [])

  const fetchEventTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/event-types')
      if (response.ok) {
        const data = await response.json()
        setEventTypes(data)
      }
    } catch (error) {
      console.error('Error fetching event types:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Choose Event Type Trigger
        </h3>
        <p className="text-sm text-gray-600">
          Select which type of event should trigger this workflow. When an event of this type is created, the workflow will automatically execute.
        </p>
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
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${eventTypeId === type.id
                  ? 'border-[#347dc4] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <Calendar className={`h-5 w-5 mr-3 ${eventTypeId === type.id ? 'text-[#347dc4]' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{type.name}</div>
                  </div>
                </div>
                {eventTypeId === type.id && (
                  <Check className="h-5 w-5 text-[#347dc4]" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

