'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const log = createLogger('inventory')

interface HistoryEntry {
  id: string
  from: {
    type: string | null
    id: string | null
    name: string
  }
  to: {
    type: string | null
    id: string | null
    name: string
  }
  assignmentType?: string | null
  event?: {
    id: string
    name: string
  } | null
  expectedReturnDate?: string | null
  changedBy?: {
    id: string
    name: string
  } | null
  changedAt: string
  reason?: string | null
}

interface AssignmentHistoryProps {
  itemId: string
  itemName: string
}

export function AssignmentHistory({ itemId, itemName }: AssignmentHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/inventory-items/${itemId}/history`)
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }

      const data = await response.json()
      setHistory(data.history || [])
    } catch (err) {
      setError('Failed to load assignment history')
      log.error({ err }, 'Error fetching history')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    fetchHistory()
  }

  const getAssignmentIcon = (type: string | null) => {
    switch (type) {
      case 'user':
        return '👤'
      case 'physical_address':
        return '📍'
      case 'product_group':
        return '📦'
      default:
        return '○'
    }
  }

  const getAssignmentTypeLabel = (type?: string | null) => {
    switch (type) {
      case 'long_term_staff':
        return 'Long-term Staff'
      case 'event_checkout':
        return 'Event Checkout'
      case 'warehouse':
        return 'Warehouse'
      default:
        return null
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        View History
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Assignment History - ${itemName}`}
      >
        <div className="min-h-[300px] max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading history...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No assignment history yet</p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {/* Timeline line */}
                  {index !== history.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  {/* History entry */}
                  <div className="flex gap-4">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold relative z-10">
                      {index === 0 ? '●' : '○'}
                    </div>

                    {/* Entry content */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Main assignment change */}
                          <div className="flex items-center gap-2 text-sm">
                            {entry.from.name !== 'Unassigned' && (
                              <>
                                <span className="font-medium text-gray-700">
                                  {getAssignmentIcon(entry.from.type)} {entry.from.name}
                                </span>
                                <span className="text-gray-400">→</span>
                              </>
                            )}
                            <span className="font-medium text-gray-900">
                              {getAssignmentIcon(entry.to.type)} {entry.to.name}
                            </span>
                          </div>

                          {/* Assignment type badge */}
                          {entry.assignmentType && (
                            <div className="mt-2">
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {getAssignmentTypeLabel(entry.assignmentType)}
                              </span>
                            </div>
                          )}

                          {/* Event info */}
                          {entry.event && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Event:</span> {entry.event.name}
                            </div>
                          )}

                          {/* Return date */}
                          {entry.expectedReturnDate && (
                            <div className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">Expected return:</span>{' '}
                              {format(new Date(entry.expectedReturnDate), 'MMM d, yyyy')}
                            </div>
                          )}

                          {/* Changed by */}
                          {entry.changedBy && (
                            <div className="mt-1 text-xs text-gray-500">
                              Changed by {entry.changedBy.name}
                            </div>
                          )}

                          {/* Reason */}
                          {entry.reason && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              "{entry.reason}"
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-gray-500 text-right ml-4">
                          {format(new Date(entry.changedAt), 'MMM d, yyyy')}
                          <br />
                          {format(new Date(entry.changedAt), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>
    </>
  )
}
