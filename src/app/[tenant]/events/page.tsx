'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Search, Plus, Eye, Edit, Trash2, Calendar as CalendarIcon, CheckCircle2, Filter, Palette, Wrench, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { formatDate, formatDateShort, getDaysUntil, isDateToday, parseLocalDate } from '@/lib/utils/date-utils'

interface EventDate {
  id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location_id: string | null
  notes: string | null
  status: string
  locations?: {
    id: string
    name: string
    address_line1: string | null
    city: string | null
    state: string | null
  }
}

interface TaskCompletion {
  event_id: string
  core_task_template_id: string
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
}

interface Event {
  id: string
  title: string
  event_type: string
  start_date: string
  end_date: string | null
  date_type: string | null
  status: string
  location: string | null
  account_name: string | null
  contact_name: string | null
  event_dates?: EventDate[]
  created_at: string
  core_tasks_ready?: boolean
  task_completions?: TaskCompletion[]
  event_categories?: {
    id: string
    name: string
    slug: string
    color: string
    icon: string | null
  }
  event_types?: {
    id: string
    name: string
    slug: string
  }
}

interface CoreTask {
  id: string
  tenant_id: string
  task_name: string
  display_order: number
  is_active: boolean
}

export default function EventsPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const [events, setEvents] = useState<Event[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Date range filter
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'upcoming' | 'past'>('upcoming')

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Sort options
  const [sortBy, setSortBy] = useState<string>('date_asc')

  // Task filtering state
  const [coreTasks, setCoreTasks] = useState<CoreTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [taskFilter, setTaskFilter] = useState<'all' | 'incomplete'>('all')
  const [taskDateRangeFilter, setTaskDateRangeFilter] = useState<number>(14) // days from now for incomplete task filter

  const fetchEvents = useCallback(async () => {
    try {
      setLocalLoading(true)
      const response = await fetch('/api/events?status=all&type=all')
      if (response.ok) {
        const data = await response.json()

        console.log('=== EVENTS FETCHED ===')
        console.log('Raw API response:', data)
        console.log('Is array?', Array.isArray(data))

        // Handle both array and object structures
        const eventsList = Array.isArray(data) ? data : (data.events || [])

        console.log('Events count:', eventsList.length)
        if (eventsList.length > 0) {
          console.log('First event:', eventsList[0])
          console.log('First event title:', eventsList[0].title)
          console.log('First event task_completions:', eventsList[0].task_completions)
        }
        console.log('=====================')

        setEvents(eventsList)
      } else {
        console.error('Failed to fetch events:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLocalLoading(false)
    }
  }, [])

  const fetchCoreTaskTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/core-tasks/templates')
      const data = await res.json()
      console.log('=== CORE TASKS FETCHED ===')
      console.log('Core tasks:', data.templates)
      console.log('Core tasks count:', data.templates?.length || 0)
      console.log('========================')
      setCoreTasks(data.templates || [])
    } catch (error) {
      console.error('Error fetching core task templates:', error)
    }
  }, [])

  useEffect(() => {
    if (session && tenant) {
      fetchEvents()
      fetchCoreTaskTemplates()
    }
  }, [session, tenant, fetchEvents, fetchCoreTaskTemplates])

  // Debug: Log when both events and coreTasks are loaded
  useEffect(() => {
    if (events.length > 0 && coreTasks.length > 0) {
      console.log('=== EVENTS PAGE DATA LOADED ===')
      console.log('Events count:', events.length)
      console.log('Core tasks count:', coreTasks.length)
      console.log('Sample event:', events[0])
      console.log('Sample event task_completions:', events[0].task_completions)
      console.log('Sample core task:', coreTasks[0])
      console.log('==============================')
    }
  }, [events, coreTasks])

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setEvents(events.filter(event => event.id !== eventId))
        }
      } catch (error) {
        console.error('Error deleting event:', error)
      }
    }
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
          <Link href="/auth/signin" className="mt-4 inline-block bg-[#347dc4] text-white px-4 py-2 rounded-md hover:bg-[#2c6ba8]">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // Helper function to get incomplete tasks for an event
  const getIncompleteTasks = (event: Event): string[] => {
    const eventName = event.title || event.id || 'Unknown'

    // If no core tasks defined, no tasks can be incomplete
    if (coreTasks.length === 0) {
      console.log(`Event ${eventName}: No coreTasks defined`)
      return []
    }

    // If event has no task_completions array, ALL tasks are incomplete
    if (!event.task_completions || event.task_completions.length === 0) {
      console.log(`Event ${eventName}: No task completion records - all tasks incomplete`, {
        coreTasksCount: coreTasks.length
      })
      return coreTasks.map(task => task.id)
    }

    // Get completed task IDs
    const completedTaskIds = new Set(
      event.task_completions
        .filter(tc => tc.is_completed)
        .map(tc => tc.core_task_template_id)
    )

    // Find tasks that are either not started or marked incomplete
    const incompleteTasks = coreTasks
      .filter(task => !completedTaskIds.has(task.id))
      .map(task => task.id)

    console.log(`Event ${eventName} incomplete tasks:`, {
      totalCoreTasks: coreTasks.length,
      totalCompletions: event.task_completions.length,
      completedCount: completedTaskIds.size,
      incompleteCount: incompleteTasks.length,
      incompleteTaskIds: incompleteTasks
    })

    return incompleteTasks
  }

  // Helper function to check if event matches selected specific tasks
  const matchesSelectedTasks = (event: Event): boolean => {
    if (selectedTaskIds.length === 0) return true

    const incompleteTasks = getIncompleteTasks(event)
    return selectedTaskIds.some(taskId => incompleteTasks.includes(taskId))
  }

  // Helper function to check if event is within task date range (for incomplete task filter)
  const isWithinTaskDateRange = (event: Event): boolean => {
    if (!event.start_date) return false
    const eventDate = new Date(event.start_date)
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + taskDateRangeFilter)
    return eventDate >= now && eventDate <= futureDate
  }

  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = (event.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (event.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (event.account_name && event.account_name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    // Status filter
    if (statusFilter !== 'all' && event.status !== statusFilter) {
      return false
    }

    // Date range filter
    if (dateRangeFilter !== 'all' && event.start_date) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      
      const eventDate = parseLocalDate(event.start_date)
      eventDate.setHours(0, 0, 0, 0)

      switch (dateRangeFilter) {
        case 'today':
          if (!isDateToday(event.start_date)) return false
          break
        
        case 'this_week':
          const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (eventDate < now || eventDate > weekEnd) return false
          break
        
        case 'this_month':
          if (eventDate.getMonth() !== now.getMonth() || 
              eventDate.getFullYear() !== now.getFullYear()) return false
          break
        
        case 'upcoming':
          if (eventDate < now) return false
          break
        
        case 'past':
          if (eventDate >= now) return false
          break
      }
    }

    // Task filter
    if (taskFilter === 'incomplete') {
      // Check if event has any incomplete tasks
      const incompleteTasks = getIncompleteTasks(event)
      const hasIncomplete = incompleteTasks.length > 0

      // Task date range filter (only when filtering by incomplete)
      const matchesTaskDateRange = isWithinTaskDateRange(event)

      // Check specific task selection
      const matchesSpecificTasks = matchesSelectedTasks(event)

      console.log(`Filtering event ${event.title || event.id}:`, {
        hasIncomplete,
        incompleteTasks: incompleteTasks.length,
        matchesTaskDateRange,
        matchesSpecificTasks,
        passesFilter: hasIncomplete && matchesTaskDateRange && matchesSpecificTasks
      })

      return hasIncomplete && matchesTaskDateRange && matchesSpecificTasks
    }

    return true
  })

  // Sort events based on user selection
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':
        // Earliest date first
        return new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime()
      
      case 'date_desc':
        // Latest date first
        return new Date(b.start_date || b.created_at).getTime() - new Date(a.start_date || a.created_at).getTime()
      
      case 'title_asc':
        // Title A-Z
        return (a.title || '').localeCompare(b.title || '')
      
      case 'title_desc':
        // Title Z-A
        return (b.title || '').localeCompare(a.title || '')
      
      case 'account_asc':
        // Account A-Z
        return (a.account_name || '').localeCompare(b.account_name || '')
      
      case 'account_desc':
        // Account Z-A
        return (b.account_name || '').localeCompare(a.account_name || '')
      
      default:
        // Default: earliest date first
        return new Date(a.start_date || a.created_at).getTime() - new Date(b.start_date || b.created_at).getTime()
    }
  })

  console.log(`=== FILTER RESULTS ===`)
  console.log(`Total events: ${events.length}`)
  console.log(`Filtered events: ${sortedEvents.length}`)
  console.log(`Date range filter: ${dateRangeFilter}`)
  console.log(`Task filter: ${taskFilter}`)
  console.log(`Selected task IDs count: ${selectedTaskIds.length}`)
  console.log(`Search term: "${searchTerm}"`)
  if (sortedEvents.length > 0) {
    console.log(`First sorted event:`, sortedEvents[0].title || sortedEvents[0].id)
  } else {
    console.log(`No events passed filter - check logs above for why`)
  }
  console.log(`=====================`)

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Error handling for empty or malformed data */}
        {events.length === 0 && !localLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">Get started by creating your first event.</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Events</h1>
                <p className="text-sm text-gray-600">Manage your photo booth events</p>
              </div>
              <div className="flex items-center space-x-4">
                <Link href={`/${tenantSubdomain}/events/calendar`}>
                  <Button variant="outline" className="border-[#347dc4] text-[#347dc4] hover:bg-[#347dc4] hover:text-white">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Calendar View
                  </Button>
                </Link>
                <Link href={`/${tenantSubdomain}/events/new`}>
                  <Button className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Event
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Search */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Date Range Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDateRangeFilter('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    dateRangeFilter === 'all'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📊 All
                </button>

                <button
                  onClick={() => setDateRangeFilter('today')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    dateRangeFilter === 'today'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📅 Today
                </button>

                <button
                  onClick={() => setDateRangeFilter('this_week')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    dateRangeFilter === 'this_week'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📆 This Week
                </button>

                <button
                  onClick={() => setDateRangeFilter('this_month')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    dateRangeFilter === 'this_month'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📅 This Month
                </button>

                <button
                  onClick={() => setDateRangeFilter('upcoming')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    dateRangeFilter === 'upcoming'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🔜 Upcoming
                </button>

                <button
                  onClick={() => setDateRangeFilter('past')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
                    dateRangeFilter === 'past'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  📋 Past
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent transition-all duration-150"
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="postponed">Postponed</option>
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent transition-all duration-150"
                  aria-label="Sort events"
                >
                  <option value="date_asc">Date (Earliest First)</option>
                  <option value="date_desc">Date (Latest First)</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="title_desc">Title (Z-A)</option>
                  <option value="account_asc">Account (A-Z)</option>
                  <option value="account_desc">Account (Z-A)</option>
                </select>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-xs text-gray-500 mt-3">
              {dateRangeFilter === 'all' && 'All events regardless of date'}
              {dateRangeFilter === 'today' && 'Events happening today'}
              {dateRangeFilter === 'this_week' && 'Events in the next 7 days'}
              {dateRangeFilter === 'this_month' && 'Events in the current month'}
              {dateRangeFilter === 'upcoming' && 'Events scheduled for today and beyond'}
              {dateRangeFilter === 'past' && 'Events that have already occurred'}
            </p>
          </div>

          {/* Task Filtering Section */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#347dc4]" />
                <h3 className="text-lg font-semibold text-gray-900">Task Filters</h3>
              </div>
            </div>

            <div className="space-y-4">
              {/* Filter Mode Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTaskFilter('all')
                    setSelectedTaskIds([])
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 ${
                    taskFilter === 'all'
                      ? 'bg-[#347dc4] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  All Events
                </button>
                <button
                  onClick={() => setTaskFilter('incomplete')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 active:scale-95 ${
                    taskFilter === 'incomplete'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-orange-50'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  Incomplete Tasks Only
                </button>
              </div>

              {taskFilter === 'incomplete' && (
                <>
                  {/* Date Range Filter */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Events within next:</label>
                    <select
                      value={taskDateRangeFilter}
                      onChange={(e) => setTaskDateRangeFilter(Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>

                  {/* Core Task Checkboxes */}
                  {coreTasks.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Filter by Specific Tasks
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {coreTasks.map(task => (
                          <label key={task.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-blue-50">
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.includes(task.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTaskIds([...selectedTaskIds, task.id])
                                } else {
                                  setSelectedTaskIds(selectedTaskIds.filter(t => t !== task.id))
                                }
                              }}
                              className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                            />
                            <span className="text-sm text-gray-700">{task.task_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Filters Display */}
                  {selectedTaskIds.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Active Task Filters:</h4>
                        <button
                          onClick={() => setSelectedTaskIds([])}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTaskIds.map(taskId => {
                          const task = coreTasks.find(t => t.id === taskId)
                          return task ? (
                            <span
                              key={taskId}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {task.task_name}
                              <button
                                onClick={() => setSelectedTaskIds(selectedTaskIds.filter(t => t !== taskId))}
                                className="hover:opacity-70"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {dateRangeFilter === 'all' && '📊 All Events'}
                  {dateRangeFilter === 'today' && '📅 Today\'s Events'}
                  {dateRangeFilter === 'this_week' && '📆 This Week\'s Events'}
                  {dateRangeFilter === 'this_month' && '📅 This Month\'s Events'}
                  {dateRangeFilter === 'upcoming' && '🔜 Upcoming Events'}
                  {dateRangeFilter === 'past' && '📋 Past Events'}
                  {taskFilter === 'incomplete' && (
                    <span className="ml-2 text-sm font-normal text-orange-600">
                      (with incomplete tasks)
                    </span>
                  )}
                </h3>
                <div className="text-sm text-gray-600">
                  Showing {sortedEvents.length} of {events.length} events
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedEvents.length === 0 && events.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <p className="text-lg font-medium mb-2">No events match your filters</p>
                          <p className="text-sm">Try adjusting your date range or search criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {sortedEvents.map((event) => {
                    const eventDateCount = event.event_dates?.length || 0
                    const firstDate = event.event_dates?.[0] || null
                    const displayDate = event.start_date ? formatDateShort(event.start_date) : 'No date'
                    const displayLocation = firstDate?.locations?.name || event.location || 'No location'
                    const daysUntil = event.start_date ? getDaysUntil(event.start_date) : null

                    // Get incomplete tasks for this event
                    const incompleteTaskIds = getIncompleteTasks(event)
                    const incompleteCount = incompleteTaskIds.length

                    return (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate max-w-48" title={event.title || 'Untitled Event'}>
                              {event.title || 'Untitled Event'}
                            </div>
                            {/* Category & Type Badges */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {event.event_categories ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    borderColor: event.event_categories.color,
                                    backgroundColor: event.event_categories.color + '20',
                                    color: event.event_categories.color
                                  }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: event.event_categories.color }}
                                  />
                                  {event.event_categories.name}
                                </div>
                              ) : null}
                              {event.event_types ? (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                  {event.event_types.name}
                                </span>
                              ) : null}
                              {!event.event_categories && !event.event_types && (
                                <span className="text-xs text-gray-400 italic">No type</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{displayDate}</span>
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                isDateToday(event.start_date || '') 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {isDateToday(event.start_date || '') ? 'Today' : `${daysUntil}d`}
                              </span>
                            )}
                          </div>
                          {eventDateCount > 1 && (
                            <div className="text-xs text-gray-500 mt-1">
                              +{eventDateCount - 1} more date{eventDateCount > 2 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-32" title={displayLocation}>
                          {displayLocation}
                          {event.date_type && event.date_type !== 'single_day' && (
                            <div className="text-xs text-gray-500 mt-1 capitalize">
                              {event.date_type.replace(/_/g, ' ')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={event.account_name || 'No account'}>
                          {event.account_name || 'No account'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              event.status === 'completed' ? 'bg-green-100 text-green-800' :
                              event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {event.status || 'Unknown'}
                            </span>
                            {event.core_tasks_ready && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready for Event
                              </span>
                            )}
                            {incompleteCount > 0 && (
                              <span
                                className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"
                                title={`${incompleteCount} incomplete task${incompleteCount > 1 ? 's' : ''}`}
                              >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {incompleteCount} Task{incompleteCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {eventDateCount > 0 ? `${eventDateCount} date${eventDateCount > 1 ? 's' : ''}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link href={`/${tenantSubdomain}/events/${event.id}`}>
                              <button
                                className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                                aria-label="View event details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => router.push(`/${tenantSubdomain}/events/${event.id}/edit`)}
                              className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                              aria-label="Edit event"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-red-600 hover:text-red-800 cursor-pointer transition-colors duration-150 active:scale-95"
                              aria-label="Delete event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}