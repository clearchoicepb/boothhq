/**
 * Core Tasks Banner - Dismissible Compact Version
 * Shows a banner at the top of Event Detail when tasks are incomplete
 * Can be dismissed by users to free up space
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const log = createLogger('events')

interface CoreTasksBannerProps {
  eventId: string
  onViewTasks?: () => void
}

export function CoreTasksBanner({ eventId, onViewTasks }: CoreTasksBannerProps) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  // Check localStorage for dismissal state
  useEffect(() => {
    const dismissedBanner = localStorage.getItem(`core-tasks-dismissed-${eventId}`)
    if (dismissedBanner === 'true') {
      setIsDismissed(true)
    }
  }, [eventId])

  // Fetch core tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/core-tasks`)
        if (response.ok) {
          const data = await response.json()
          setTasks(data)
        }
      } catch (error) {
        log.error({ error }, 'Error fetching core tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [eventId])

  const handleDismiss = () => {
    localStorage.setItem(`core-tasks-dismissed-${eventId}`, 'true')
    setIsDismissed(true)
  }

  const handleRestore = () => {
    localStorage.removeItem(`core-tasks-dismissed-${eventId}`)
    setIsDismissed(false)
  }

  if (loading) {
    return null // Don't show while loading
  }

  const completedTasks = tasks.filter(t => t.is_completed).length
  const totalTasks = tasks.length
  const incompleteTasks = totalTasks - completedTasks
  const allComplete = incompleteTasks === 0

  // Don't show if all tasks are complete
  if (allComplete) {
    return null
  }

  // Show minimal restore button if dismissed
  if (isDismissed) {
    return (
      <div className="mb-4">
        <button
          onClick={handleRestore}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          <span>{incompleteTasks} core task{incompleteTasks !== 1 ? 's' : ''} remaining</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Show full banner
  return (
    <div className="mb-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  Core Tasks Checklist
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {completedTasks} of {totalTasks} tasks complete
                  {incompleteTasks > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      {incompleteTasks} remaining
                    </span>
                  )}
                </p>
                {/* Progress bar */}
                <div className="mt-2 bg-gray-200 rounded-full h-2 max-w-md">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={onViewTasks}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  View Checklist
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <button
                  onClick={handleDismiss}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Dismiss banner"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
