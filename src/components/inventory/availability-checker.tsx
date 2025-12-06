'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useItemCategoriesData } from '@/hooks/useItemCategoriesData'
import { BookingModal } from './booking-modal'
import { format } from 'date-fns'
import { createLogger } from '@/lib/logger'

const log = createLogger('inventory')

interface AvailabilityResult {
  available: any[]
  unavailable: any[]
  summary: {
    total: number
    available: number
    unavailable: number
    start_date: string
    end_date: string
  }
}

export function AvailabilityChecker() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState('all')
  const [results, setResults] = useState<AvailabilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  const { data: categories = [] } = useItemCategoriesData()

  const checkAvailability = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates')
      return
    }

    setLoading(true)
    setError(null)
    setSelectedItems(new Set())

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })

      if (category && category !== 'all') {
        params.append('category', category)
      }

      const response = await fetch(`/api/inventory-items/availability?${params}`)
      if (!response.ok) {
        throw new Error('Failed to check availability')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError('Failed to check availability. Please try again.')
      log.error({ err }, 'Error checking availability')
    } finally {
      setLoading(false)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleBookSelected = () => {
    if (!results || selectedItems.size === 0) return
    setIsBookingModalOpen(true)
  }

  const handleBookingComplete = () => {
    setIsBookingModalOpen(false)
    setSelectedItems(new Set())
    // Refresh availability results
    checkAvailability()
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Check Equipment Availability</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category (Optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={checkAvailability}
              disabled={loading || !startDate || !endDate}
              className="w-full"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Checking...' : 'Check Availability'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">
                  Availability for {formatDate(results.summary.start_date)} - {formatDate(results.summary.end_date)}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {results.summary.available} of {results.summary.total} items available
                </p>
              </div>
              {selectedItems.size > 0 && (
                <Button onClick={handleBookSelected}>
                  Book {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>

          {/* Available Items */}
          {results.available.length > 0 && (
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b bg-green-50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">
                    Available Items ({results.available.length})
                  </h4>
                </div>
              </div>
              <div className="divide-y">
                {results.available.map((item: any) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{item.item_name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.item_category}
                            {item.model && ` • ${item.model}`}
                            {item.tracking_type === 'serial_number' && item.serial_number &&
                              ` • S/N: ${item.serial_number}`}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span className="inline-flex items-center gap-1">
                              📍 {item.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Available
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unavailable Items */}
          {results.unavailable.length > 0 && (
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b bg-red-50">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">
                    Unavailable Items ({results.unavailable.length})
                  </h4>
                </div>
              </div>
              <div className="divide-y">
                {results.unavailable.map((item: any) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.item_name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.item_category}
                          {item.model && ` • ${item.model}`}
                          {item.tracking_type === 'serial_number' && item.serial_number &&
                            ` • S/N: ${item.serial_number}`}
                        </div>
                        {item.unavailable_reason && (
                          <div className="text-sm text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {item.unavailable_reason}
                          </div>
                        )}
                        {item.returns_during_period && item.available_from && (
                          <div className="text-sm text-blue-600 mt-1">
                            💡 Available from {formatDate(item.available_from)}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Unavailable
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.available.length === 0 && results.unavailable.length === 0 && (
            <div className="bg-white p-8 rounded-lg border text-center">
              <p className="text-gray-500">No items found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {results && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={handleBookingComplete}
          items={results.available.filter(item => selectedItems.has(item.id))}
          dateRange={{ start: startDate, end: endDate }}
        />
      )}
    </div>
  )
}
