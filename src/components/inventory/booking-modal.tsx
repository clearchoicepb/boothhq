'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useUpdateInventoryItem } from '@/hooks/useInventoryItemsData'
import { useUsers } from '@/hooks/useUsers'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  items: any[]
  dateRange: { start: string; end: string }
}

export function BookingModal({ isOpen, onClose, items, dateRange }: BookingModalProps) {
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventName, setEventName] = useState('')
  const [assignToUser, setAssignToUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateItem = useUpdateInventoryItem()
  const { data: users = [] } = useUsers()

  useEffect(() => {
    if (isOpen) {
      fetchEvents()
    }
  }, [isOpen])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data || [])
      }
    } catch (err) {
      console.error('Error fetching events:', err)
    }
  }

  const handleBook = async () => {
    if (!selectedEventId && !eventName) {
      setError('Please select or enter an event name')
      return
    }

    if (!assignToUser) {
      setError('Please select a staff member')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Update each item with the event assignment
      for (const item of items) {
        await updateItem.mutateAsync({
          itemId: item.id,
          itemData: {
            assigned_to_type: 'user',
            assigned_to_id: assignToUser,
            assignment_type: 'event_checkout',
            event_id: selectedEventId || null,
            expected_return_date: dateRange.end
          }
        })
      }

      // Success! Close modal
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to book items')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Book Equipment (${items.length} item${items.length !== 1 ? 's' : ''})`}
    >
      <div className="max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Items List */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items to Book
            </label>
            <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item.id} className="text-sm text-gray-700">
                    • {item.item_name}
                    {item.model && ` (${item.model})`}
                    {item.serial_number && ` - S/N: ${item.serial_number}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Event Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event (Optional)
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value)
                if (e.target.value) {
                  const event = events.find(ev => ev.id === e.target.value)
                  if (event) setEventName(event.event_name)
                }
              }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select an existing event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.event_name} - {new Date(event.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Or leave blank if not linked to a specific event
            </p>
          </div>

          {/* Staff Assignment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To Staff Member *
            </label>
            <select
              value={assignToUser}
              onChange={(e) => setAssignToUser(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select staff member...</option>
              {users.map((user: { id: string; first_name?: string; last_name?: string }) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Display */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-900">
              <div className="font-medium mb-1">Event Dates</div>
              <div className="flex items-center gap-2 text-blue-700">
                <span>{new Date(dateRange.start).toLocaleDateString()}</span>
                <span>→</span>
                <span>{new Date(dateRange.end).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                Equipment will be marked for return on {new Date(dateRange.end).toLocaleDateString()}
              </div>
            </div>
          </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleBook}
          disabled={loading}
        >
          {loading ? 'Booking...' : `Book ${items.length} Item${items.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </Modal>
  )
}
