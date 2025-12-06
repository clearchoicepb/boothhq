'use client'

import { useState, useEffect } from 'react'
import { maintenanceService } from '@/lib/api/services/maintenanceService'
import { MaintenanceHistoryTimeline } from './maintenance-history-timeline'
import { Search, Filter, Calendar } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('maintenance')

export function MaintenanceHistory() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('all')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await maintenanceService.list({
        sort_by: 'maintenance_date',
        sort_order: 'desc'
      })
      setHistory(data)
    } catch (error) {
      log.error({ error }, 'Failed to load maintenance history')
    } finally {
      setLoading(false)
    }
  }

  // Filter history based on search and date
  const filteredHistory = history.filter(record => {
    // Search filter
    const matchesSearch = !searchTerm ||
      record.inventory_item?.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Date filter
    if (dateFilter === 'all') return true

    const recordDate = new Date(record.maintenance_date)
    const now = new Date()

    switch (dateFilter) {
      case 'month':
        return recordDate >= new Date(now.getFullYear(), now.getMonth(), 1)
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        return recordDate >= quarterStart
      case 'year':
        return recordDate >= new Date(now.getFullYear(), 0, 1)
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading maintenance history...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item, person, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('quarter')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'quarter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Quarter
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Year
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredHistory.length} of {history.length} maintenance records
        </div>
      </div>

      {/* Timeline */}
      {filteredHistory.length > 0 ? (
        <MaintenanceHistoryTimeline records={filteredHistory} />
      ) : (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Maintenance Records Found
          </h3>
          <p className="text-gray-600">
            {searchTerm || dateFilter !== 'all'
              ? 'Try adjusting your filters to see more results'
              : 'Maintenance history will appear here once equipment maintenance is completed'
            }
          </p>
        </div>
      )}
    </div>
  )
}
