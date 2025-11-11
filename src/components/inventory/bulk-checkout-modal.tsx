'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useUpdateInventoryItem } from '@/hooks/useInventoryItemsData'

interface BulkCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  items: any[]
}

export function BulkCheckoutModal({ isOpen, onClose, items }: BulkCheckoutModalProps) {
  const [events, setEvents] = useState<any[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [assignToUser, setAssignToUser] = useState('')
  const [assignmentType, setAssignmentType] = useState<string>('event_checkout')
  const [returnDate, setReturnDate] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateItem = useUpdateInventoryItem()

  useEffect(() => {
    if (isOpen) {
      fetchEvents()
      fetchUsers()
      // Set default return date to next Monday
      const today = new Date()
      const nextMonday = new Date(today)
      nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7))
      setReturnDate(nextMonday.toISOString().split('T')[0])
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const handleCheckout = async () => {
    if (!assignToUser) {
      setError('Please select a staff member')
      return
    }

    if (assignmentType === 'event_checkout' && !returnDate) {
      setError('Please select a return date for event checkout')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Update each item
      for (const item of items) {
        const updateData: any = {
          assigned_to_type: 'user',
          assigned_to_id: assignToUser,
          assignment_type: assignmentType,
        }

        if (assignmentType === 'event_checkout') {
          updateData.expected_return_date = returnDate
          if (selectedEventId) {
            updateData.event_id = selectedEventId
          }
        }

        await updateItem.mutateAsync({
          itemId: item.id,
          itemData: updateData
        })
      }

      // Success! Close modal
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to checkout items')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Checkout Equipment (${items.length} item${items.length !== 1 ? 's' : ''})`}
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
              Items to Checkout
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

          {/* Assignment Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Type *
            </label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="event_checkout">Event Checkout (Weekend)</option>
              <option value="long_term_staff">Long-term Staff (Months)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {assignmentType === 'event_checkout'
                ? 'For weekend events with expected return date'
                : 'For permanent staff assignments (no return date)'}
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
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Selection (Optional for event checkout) */}
          {assignmentType === 'event_checkout' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Event (Optional)
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">No specific event...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.event_name} - {new Date(event.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Return Date *
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typically Monday after event weekend
                </p>
              </div>
            </>
          )}

          {/* Summary */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-900">
              <div className="font-medium mb-2">Summary</div>
              <div className="space-y-1 text-blue-700">
                <div>• Checking out {items.length} item{items.length !== 1 ? 's' : ''}</div>
                <div>• Assignment: {assignmentType === 'event_checkout' ? 'Event Checkout' : 'Long-term Staff'}</div>
                {assignmentType === 'event_checkout' && returnDate && (
                  <div>• Expected return: {new Date(returnDate).toLocaleDateString()}</div>
                )}
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
          onClick={handleCheckout}
          disabled={loading}
        >
          {loading ? 'Checking Out...' : `Checkout ${items.length} Item${items.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </Modal>
  )
}
