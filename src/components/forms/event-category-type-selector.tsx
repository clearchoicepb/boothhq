'use client'

import { useState, useEffect } from 'react'

interface EventCategory {
  id: string
  name: string
  color: string
  is_active: boolean
}

interface EventType {
  id: string
  name: string
  slug: string
  is_active: boolean
  event_category_id: string
}

interface EventCategoryTypeSelectorProps {
  selectedCategoryId: string
  selectedTypeId: string
  onCategoryChange: (id: string) => void
  onTypeChange: (id: string) => void
  required?: boolean
  disabled?: boolean
}

export function EventCategoryTypeSelector({
  selectedCategoryId,
  selectedTypeId,
  onCategoryChange,
  onTypeChange,
  required = true,
  disabled = false
}: EventCategoryTypeSelectorProps) {
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTypes, setLoadingTypes] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/event-categories')
        const data = await res.json()
        setCategories(data.categories?.filter((c: EventCategory) => c.is_active) || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchEventTypes = async (categoryId: string) => {
      setLoadingTypes(true)
      try {
        const res = await fetch(`/api/event-types?category_id=${categoryId}`)
        const data = await res.json()
        setEventTypes(data.eventTypes?.filter((t: EventType) => t.is_active) || [])
      } catch (error) {
        console.error('Error fetching event types:', error)
      } finally {
        setLoadingTypes(false)
      }
    }

    if (selectedCategoryId) {
      fetchEventTypes(selectedCategoryId)
    } else {
      setEventTypes([])
      if (selectedTypeId) {
        onTypeChange('')
      }
    }
  }, [selectedCategoryId, selectedTypeId, onTypeChange])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Event Category Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Event Category {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedCategoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Choose workflow type (Social vs Corporate)
        </p>
      </div>

      {/* Event Type Dropdown (shows after category selected) */}
      {selectedCategoryId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type {required && <span className="text-red-500">*</span>}
          </label>
          {loadingTypes ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              <select
                value={selectedTypeId}
                onChange={(e) => onTypeChange(e.target.value)}
                required={required}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select event type...</option>
                {eventTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Specific event type within this category
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
