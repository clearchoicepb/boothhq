'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ClipboardList, Calendar } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('events')

interface EventPriorityStatsCardsProps {
  onCardClick?: (filter: 'next_10_days' | 'tasks_45_days' | 'all_upcoming') => void
}

interface PriorityStats {
  next10Days: {
    count: number
    tasksComplete: number
    tasksTotal: number
    completionPercentage: number
  }
  next45DaysWithTasks: {
    count: number
    incompleteTasks: number
  }
  allUpcoming: {
    count: number
    throughDate: string
  }
}

export function EventPriorityStatsCards({ onCardClick }: EventPriorityStatsCardsProps) {
  const [stats, setStats] = useState<PriorityStats>({
    next10Days: {
      count: 0,
      tasksComplete: 0,
      tasksTotal: 0,
      completionPercentage: 0
    },
    next45DaysWithTasks: {
      count: 0,
      incompleteTasks: 0
    },
    allUpcoming: {
      count: 0,
      throughDate: ''
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPriorityStats()
  }, [])

  const fetchPriorityStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events/priority-stats')
      const data = await response.json()

      setStats({
        next10Days: data.next10Days || {
          count: 0,
          tasksComplete: 0,
          tasksTotal: 0,
          completionPercentage: 0
        },
        next45DaysWithTasks: data.next45DaysWithTasks || {
          count: 0,
          incompleteTasks: 0
        },
        allUpcoming: data.allUpcoming || {
          count: 0,
          throughDate: ''
        }
      })
    } catch (error) {
      log.error({ error }, 'Failed to fetch priority stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white p-3 rounded-lg shadow">
            <div className="h-24 animate-pulse bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Card 1: Next 10 Days - CRITICAL PRIORITY */}
      <div
        className="bg-gradient-to-br from-red-50 to-orange-50 p-3 rounded-lg shadow-lg border-2 border-orange-200 hover:shadow-xl transition-all duration-200 cursor-pointer group"
        onClick={() => onCardClick?.('next_10_days')}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-semibold text-orange-900 uppercase tracking-wide">
                Next 10 Days
              </p>
            </div>
            <p className="text-2xl font-bold text-orange-900 mb-0.5">
              {stats.next10Days.count}
            </p>
            <p className="text-xs text-orange-700 font-medium">
              Critical Priority Events
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <span className="text-lg">🔥</span>
          </div>
        </div>

        {/* Task Completion Progress */}
        <div className="mt-2 pt-2 border-t border-orange-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-orange-800">Task Completion</span>
            <span className="text-xs font-bold text-orange-900">
              {stats.next10Days.completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-orange-200 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.next10Days.completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-orange-700 mt-1">
            {stats.next10Days.tasksComplete} of {stats.next10Days.tasksTotal} tasks complete
          </p>
        </div>

        <div className="mt-1.5 text-xs text-orange-600 font-medium group-hover:text-orange-800">
          Click to filter →
        </div>
      </div>

      {/* Card 2: Next 45 Days with Incomplete Tasks */}
      <div
        className="bg-gradient-to-br from-amber-50 to-yellow-50 p-3 rounded-lg shadow-lg border-2 border-amber-200 hover:shadow-xl transition-all duration-200 cursor-pointer group"
        onClick={() => onCardClick?.('tasks_45_days')}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                Tasks Due (45 Days)
              </p>
            </div>
            <p className="text-2xl font-bold text-amber-900 mb-0.5">
              {stats.next45DaysWithTasks.count}
            </p>
            <p className="text-xs text-amber-700 font-medium">
              Events Requiring Attention
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <span className="text-lg">⚠️</span>
          </div>
        </div>

        {/* Incomplete Tasks Count */}
        <div className="mt-2 pt-2 border-t border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Open Tasks</span>
            <span className="text-xl font-bold text-amber-900">
              {stats.next45DaysWithTasks.incompleteTasks}
            </span>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Tasks need completion before events
          </p>
        </div>

        <div className="mt-1.5 text-xs text-amber-600 font-medium group-hover:text-amber-800">
          Click to filter →
        </div>
      </div>

      {/* Card 3: All Upcoming Events */}
      <div
        className="bg-gradient-to-br from-blue-50 to-sky-50 p-3 rounded-lg shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-200 cursor-pointer group"
        onClick={() => onCardClick?.('all_upcoming')}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                All Upcoming
              </p>
            </div>
            <p className="text-2xl font-bold text-blue-900 mb-0.5">
              {stats.allUpcoming.count}
            </p>
            <p className="text-xs text-blue-700 font-medium">
              Total Pipeline
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <span className="text-lg">📅</span>
          </div>
        </div>

        {/* Through Date */}
        <div className="mt-2 pt-2 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-800">Through</span>
            <span className="text-sm font-bold text-blue-900">
              {stats.allUpcoming.throughDate || 'Dec 2025'}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            All scheduled future events
          </p>
        </div>

        <div className="mt-1.5 text-xs text-blue-600 font-medium group-hover:text-blue-800">
          Click to filter →
        </div>
      </div>
    </div>
  )
}
