'use client'

import { useEffect, useState } from 'react'
import { Calendar, CalendarCheck, CalendarRange } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('events')

interface EventsStatsCardsProps {
  filters?: {
    status?: string
    event_type?: string
  }
}

export function EventsStatsCards({ filters }: EventsStatsCardsProps) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    thisWeekEvents: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [filters])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters?.event_type && filters.event_type !== 'all') {
        params.append('event_type', filters.event_type)
      }

      const response = await fetch(`/api/events/stats?${params}`)
      const data = await response.json()
      
      setStats({
        totalEvents: data.totalEvents || 0,
        upcomingEvents: data.upcomingEvents || 0,
        thisWeekEvents: data.thisWeekEvents || 0,
      })
    } catch (error) {
      log.error({ error }, 'Failed to fetch event stats')
    } finally {
      setLoading(false)
    }
  }

  // Calculate date range for "This Week" display
  const getWeekDateRange = () => {
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    return `${formatDate(today)} - ${formatDate(weekEnd)}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="h-20 animate-pulse bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Total Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Total Events
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalEvents}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              All event types
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Upcoming Events
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.upcomingEvents}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Future scheduled
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CalendarCheck className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Events This Week */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Events This Week
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.thisWeekEvents}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {getWeekDateRange()}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
            <CalendarRange className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  )
}

