'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Search, Plus, Eye, Edit, Trash2, Calendar as CalendarIcon, CheckCircle2, Filter, Palette, Wrench, AlertCircle, X, Download, ChevronDown, Grid, List, ChevronRight, ChevronDown as ChevronDownIcon } from 'lucide-react'
import { Select } from '@/components/ui/select'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { formatDate, formatDateShort, getDaysUntil, isDateToday, parseLocalDate } from '@/lib/utils/date-utils'
import { TaskIndicator } from '@/components/opportunities/task-indicator'
import { exportToCSV } from '@/lib/csv-export'
import { EventTimelineView } from '@/components/events/event-timeline-view'
import { EventInlineTasks } from '@/components/events/event-inline-tasks'
import { EventFilters, type FilterState } from '@/components/events/event-filters'
import { EventQuickActionsMenu } from '@/components/events/event-quick-actions-menu'
import { EventBulkActionsBar } from '@/components/events/event-bulk-actions-bar'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useEvents } from '@/hooks/useEvents'
import { useCoreTaskTemplates } from '@/hooks/useCoreTaskTemplates'
import { useEventsTaskStatus } from '@/hooks/useEventsTaskStatus'

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

  // ✨ REACT QUERY HOOKS - Automatic caching and background refetching!
  const queryClient = useQueryClient()
  const { data: events = [], isLoading: eventsLoading } = useEvents()
  const { data: coreTasks = [] } = useCoreTaskTemplates()
  const eventIds = useMemo(() => events.map(e => e.id), [events])
  const { data: taskStatus = {} } = useEventsTaskStatus(eventIds)

  // Aggregate loading state
  const localLoading = eventsLoading

  // UI State (not data fetching)
  // View mode state (table vs timeline)
  const [currentView, setCurrentView] = useState<'table' | 'timeline'>('table')

  // Expanded rows state (for inline tasks)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [eventTaskCompletions, setEventTaskCompletions] = useState<Record<string, any[]>>({})
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set())

  // Sort options
  const [sortBy, setSortBy] = useState<string>('date_asc')

  // Filter state (consolidated)
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    dateRangeFilter: 'upcoming',
    customDaysFilter: null,
    statusFilter: 'all',
    taskFilter: 'all',
    taskDateRangeFilter: 14,
    selectedTaskIds: []
  })

  // Bulk selection state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('events_view_mode')
    if (savedView === 'table' || savedView === 'timeline') {
      setCurrentView(savedView)
    }
  }, [])

  // Save view preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('events_view_mode', currentView)
  }, [currentView])

  // Handler for view change
  const handleViewChange = (newView: 'table' | 'timeline') => {
    setCurrentView(newView)
  }

  // Handler for expanding/collapsing rows
  const handleToggleRow = async (eventId: string) => {
    const newExpandedRows = new Set(expandedRows)

    if (newExpandedRows.has(eventId)) {
      // Collapse the row
      newExpandedRows.delete(eventId)
      setExpandedRows(newExpandedRows)
    } else {
      // Expand the row and fetch task completions if not already loaded
      newExpandedRows.add(eventId)
      setExpandedRows(newExpandedRows)

      if (!eventTaskCompletions[eventId]) {
        await fetchEventTaskCompletions(eventId)
      }
    }
  }

  // Fetch task completions for a specific event
  const fetchEventTaskCompletions = async (eventId: string) => {
    setLoadingTasks(prev => new Set(prev).add(eventId))

    try {
      const response = await fetch(`/api/events/${eventId}/core-tasks`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const tasks = await response.json()
      setEventTaskCompletions(prev => ({
        ...prev,
        [eventId]: tasks
      }))
    } catch (error) {
      console.error('Error fetching event tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoadingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(eventId)
        return newSet
      })
    }
  }

  // Handler for task update (refresh event data)
  const handleTaskUpdate = async () => {
    // Refetch events to update task completion counts
    queryClient.invalidateQueries({ queryKey: ['events'] })
    queryClient.invalidateQueries({ queryKey: ['eventsTaskStatus'] })
  }


  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          // Invalidate events query to refetch
          queryClient.invalidateQueries({ queryKey: ['events'] })
          toast.success('Event deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting event:', error)
        toast.error('Failed to delete event')
      }
    }
  }

  const handleExportCSV = () => {
    const columns = [
      { key: 'title', label: 'Event Title' },
      { key: 'event_type', label: 'Event Type' },
      { key: 'status', label: 'Status' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'location', label: 'Location' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'account_name', label: 'Account' },
      { key: 'created_at', label: 'Created Date' }
    ]

    const filename = `events-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(sortedEvents, filename, columns)
    toast.success(`Exported ${sortedEvents.length} events`)
  }

  // Bulk operation handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEventIds = new Set(sortedEvents.map(e => e.id))
      setSelectedEventIds(allEventIds)
    } else {
      setSelectedEventIds(new Set())
    }
  }

  const handleSelectEvent = (eventId: string, checked: boolean) => {
    const newSelection = new Set(selectedEventIds)
    if (checked) {
      newSelection.add(eventId)
    } else {
      newSelection.delete(eventId)
    }
    setSelectedEventIds(newSelection)
  }

  const handleBulkDelete = async () => {
    const count = selectedEventIds.size
    if (!confirm(`Are you sure you want to delete ${count} event${count > 1 ? 's' : ''}?`)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedEventIds).map(eventId =>
        fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)

      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(`Deleted ${count} event${count > 1 ? 's' : ''} successfully`)
      setSelectedEventIds(new Set())
    } catch (error) {
      console.error('Error deleting events:', error)
      toast.error('Failed to delete some events')
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    const count = selectedEventIds.size

    try {
      const updatePromises = Array.from(selectedEventIds).map(eventId =>
        fetch(`/api/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      )

      await Promise.all(updatePromises)

      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success(`Updated ${count} event${count > 1 ? 's' : ''} to ${newStatus}`)
      setSelectedEventIds(new Set())
    } catch (error) {
      console.error('Error updating event statuses:', error)
      toast.error('Failed to update some events')
    }
  }

  const handleBulkExport = () => {
    const selectedEvents = sortedEvents.filter(e => selectedEventIds.has(e.id))

    const columns = [
      { key: 'title', label: 'Event Title' },
      { key: 'event_type', label: 'Event Type' },
      { key: 'status', label: 'Status' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'location', label: 'Location' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'account_name', label: 'Account' },
      { key: 'created_at', label: 'Created Date' }
    ]

    const filename = `events-selected-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(selectedEvents, filename, columns)
    toast.success(`Exported ${selectedEvents.length} selected events`)
  }

  // Handle drag-and-drop event move
  const handleEventMove = async (eventId: string, newSectionId: string) => {
    // Calculate new date based on section
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    let newStartDate = new Date(now)

    switch (newSectionId) {
      case 'todayTomorrow':
        // Set to tomorrow
        newStartDate.setDate(now.getDate() + 1)
        break
      case 'thisWeek':
        // Set to 5 days from now
        newStartDate.setDate(now.getDate() + 5)
        break
      case 'nextTwoWeeks':
        // Set to 10 days from now
        newStartDate.setDate(now.getDate() + 10)
        break
      case 'next15To45Days':
        // Set to 30 days from now
        newStartDate.setDate(now.getDate() + 30)
        break
      case 'beyond45Days':
        // Set to 60 days from now
        newStartDate.setDate(now.getDate() + 60)
        break
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: newStartDate.toISOString().split('T')[0]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update event date')
      }

      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event date updated successfully')
    } catch (error) {
      console.error('Error moving event:', error)
      toast.error('Failed to update event date')
    }
  }

  // Calculate event counts for different date filters (for badge counts)
  // Must be before early returns to maintain hook order
  const calculateEventCounts = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const counts = {
      total: events.length,
      filtered: 0, // Will be set after filtering
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      upcoming: 0,
      past: 0,
      next10Days: 0,
      next45Days: 0
    }

    events.forEach(event => {
      if (!event.start_date) return

      const eventDate = parseLocalDate(event.start_date)
      eventDate.setHours(0, 0, 0, 0)

      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Today
      if (isDateToday(event.start_date)) {
        counts.today++
      }

      // This week (next 7 days)
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      if (eventDate >= now && eventDate <= weekEnd) {
        counts.thisWeek++
      }

      // This month
      if (eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()) {
        counts.thisMonth++
      }

      // Upcoming (future events)
      if (eventDate >= now) {
        counts.upcoming++
      }

      // Past
      if (eventDate < now) {
        counts.past++
      }

      // Next 10 days
      if (daysUntil >= 0 && daysUntil <= 10) {
        counts.next10Days++
      }

      // Next 45 days with incomplete tasks (inline logic to avoid calling helper function)
      if (daysUntil >= 0 && daysUntil <= 45 && coreTasks.length > 0) {
        // Check if event has incomplete tasks
        let hasIncompleteTasks = false

        if (!event.task_completions || event.task_completions.length === 0) {
          // No completions means all tasks are incomplete
          hasIncompleteTasks = true
        } else {
          // Check if any tasks are not completed
          const completedTaskIds = new Set(
            event.task_completions
              .filter(tc => tc.is_completed)
              .map(tc => tc.core_task_template_id)
          )
          hasIncompleteTasks = coreTasks.some(task => !completedTaskIds.has(task.id))
        }

        if (hasIncompleteTasks) {
          counts.next45Days++
        }
      }
    })

    return counts
  }, [events, coreTasks])

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
    // If no core tasks defined, no tasks can be incomplete
    if (coreTasks.length === 0) {
      return []
    }

    // If event has no task_completions array, ALL tasks are incomplete
    if (!event.task_completions || event.task_completions.length === 0) {
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

    return incompleteTasks
  }

  // Helper function to check if event matches selected specific tasks
  const matchesSelectedTasks = (event: Event): boolean => {
    if (filters.selectedTaskIds.length === 0) return true

    const incompleteTasks = getIncompleteTasks(event)
    return filters.selectedTaskIds.some(taskId => incompleteTasks.includes(taskId))
  }

  // Helper function to check if event is within task date range (for incomplete task filter)
  const isWithinTaskDateRange = (event: Event): boolean => {
    if (!event.start_date) return false
    const eventDate = new Date(event.start_date)
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + filters.taskDateRangeFilter)
    return eventDate >= now && eventDate <= futureDate
  }

  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = (event.title || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         (event.location || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                         (event.account_name && event.account_name.toLowerCase().includes(filters.searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    // Status filter
    if (filters.statusFilter !== 'all' && event.status !== filters.statusFilter) {
      return false
    }

    // Date range filter
    if (filters.dateRangeFilter !== 'all' && event.start_date) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      const eventDate = parseLocalDate(event.start_date)
      eventDate.setHours(0, 0, 0, 0)

      switch (filters.dateRangeFilter) {
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

        case 'custom_days':
          if (filters.customDaysFilter !== null) {
            const customEnd = new Date(now.getTime() + filters.customDaysFilter * 24 * 60 * 60 * 1000)
            customEnd.setHours(23, 59, 59, 999)
            if (eventDate < now || eventDate > customEnd) return false
          }
          break
      }
    }

    // Task filter
    if (filters.taskFilter === 'incomplete') {
      // Check if event has any incomplete tasks
      const incompleteTasks = getIncompleteTasks(event)
      const hasIncomplete = incompleteTasks.length > 0

      // Task date range filter (only when filtering by incomplete)
      const matchesTaskDateRange = isWithinTaskDateRange(event)

      // Check specific task selection
      const matchesSpecificTasks = matchesSelectedTasks(event)

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
                <Button 
                  variant="outline" 
                  onClick={handleExportCSV}
                  className="border-gray-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
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

          {/* Enhanced Filters */}
          <EventFilters
            filters={filters}
            onFiltersChange={setFilters}
            coreTasks={coreTasks}
            eventCounts={{ ...calculateEventCounts, filtered: sortedEvents.length }}
          />

          {/* View Toggle and Sort */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-gray-900">View</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewChange('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      currentView === 'table'
                        ? 'bg-[#347dc4] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Table View"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    onClick={() => handleViewChange('timeline')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      currentView === 'timeline'
                        ? 'bg-[#347dc4] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title="Timeline View"
                  >
                    <Grid className="h-4 w-4" />
                    <span className="hidden sm:inline">Timeline</span>
                  </button>
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-sm"
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
          </div>

          {/* Timeline View */}
          {currentView === 'timeline' && (
            <EventTimelineView
              events={sortedEvents}
              tenantSubdomain={tenantSubdomain}
              coreTasks={coreTasks}
              onEventMove={handleEventMove}
            />
          )}

          {/* Table View */}
          {currentView === 'table' && (
            <>
          {/* Events Table - Desktop */}
          <div className="hidden lg:block bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {filters.dateRangeFilter === 'all' && '📊 All Events'}
                  {filters.dateRangeFilter === 'today' && '📅 Today\'s Events'}
                  {filters.dateRangeFilter === 'this_week' && '📆 This Week\'s Events'}
                  {filters.dateRangeFilter === 'this_month' && '📅 This Month\'s Events'}
                  {filters.dateRangeFilter === 'upcoming' && '🔜 Upcoming Events'}
                  {filters.dateRangeFilter === 'past' && '📋 Past Events'}
                  {filters.taskFilter === 'incomplete' && (
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
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      {/* Expand/Collapse */}
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      {/* Select All Checkbox */}
                      <input
                        type="checkbox"
                        checked={sortedEvents.length > 0 && selectedEventIds.size === sortedEvents.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                      />
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedEvents.length === 0 && events.length > 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
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
                    const totalTasks = coreTasks.length
                    const completedTasks = totalTasks - incompleteCount
                    const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

                    // Determine priority level based on days until event and task status
                    const getPriorityLevel = () => {
                      if (daysUntil === null || daysUntil < 0) return 'none'
                      if (daysUntil <= 2) return 'critical' // Red
                      if (daysUntil <= 7) return 'high' // Orange
                      if (daysUntil <= 14) return 'medium' // Yellow
                      if (daysUntil <= 30) return 'low' // Blue
                      return 'none' // Gray
                    }

                    const priorityLevel = getPriorityLevel()

                    // Priority colors and badges
                    const priorityConfig = {
                      critical: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴', border: 'border-l-4 border-red-500' },
                      high: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🟠', border: 'border-l-4 border-orange-500' },
                      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡', border: 'border-l-4 border-yellow-500' },
                      low: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵', border: 'border-l-4 border-blue-500' },
                      none: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⚪', border: '' }
                    }

                    const priority = priorityConfig[priorityLevel]
                    const isExpanded = expandedRows.has(event.id)
                    const isLoadingTasks = loadingTasks.has(event.id)

                    return (
                      <>
                      <tr key={event.id} className={`hover:bg-gray-50 ${priority.border}`}>
                        {/* Expand/Collapse Button */}
                        <td className="px-2 py-4 text-center">
                          <button
                            onClick={() => handleToggleRow(event.id)}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#347dc4] rounded"
                            title={isExpanded ? 'Collapse tasks' : 'Expand tasks'}
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </button>
                        </td>

                        {/* Selection Checkbox */}
                        <td className="px-2 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedEventIds.has(event.id)}
                            onChange={(e) => handleSelectEvent(event.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                          />
                        </td>

                        {/* Priority Indicator */}
                        <td className="px-3 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xl">{priority.icon}</span>
                            {taskStatus[event.id] && (taskStatus[event.id].isDueSoon || taskStatus[event.id].isOverdue) && (
                              <TaskIndicator
                                isOverdue={taskStatus[event.id].isOverdue}
                                isDueSoon={taskStatus[event.id].isDueSoon}
                              />
                            )}
                          </div>
                        </td>

                        {/* Event Name */}
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

                        {/* Days Until */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {daysUntil !== null && daysUntil >= 0 ? (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${priority.bg} ${priority.text}`}>
                                {isDateToday(event.start_date || '') ? 'TODAY' : `${daysUntil} days`}
                              </span>
                            </div>
                          ) : daysUntil !== null && daysUntil < 0 ? (
                            <span className="text-xs text-gray-500">Past event</span>
                          ) : (
                            <span className="text-xs text-gray-400">No date</span>
                          )}
                        </td>

                        {/* Task Progress */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {totalTasks > 0 ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {completedTasks}/{totalTasks}
                                </span>
                                <span className={`text-xs font-semibold ${
                                  taskCompletionPercentage === 100 ? 'text-green-600' :
                                  taskCompletionPercentage >= 75 ? 'text-blue-600' :
                                  taskCompletionPercentage >= 50 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {taskCompletionPercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    taskCompletionPercentage === 100 ? 'bg-green-500' :
                                    taskCompletionPercentage >= 75 ? 'bg-blue-500' :
                                    taskCompletionPercentage >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${taskCompletionPercentage}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No tasks</span>
                          )}
                        </td>

                        {/* Start Date */}
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{displayDate}</div>
                          {eventDateCount > 1 && (
                            <div className="text-xs text-gray-500 mt-1">
                              +{eventDateCount - 1} more
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-32" title={displayLocation}>
                          {displayLocation}
                          {event.date_type && event.date_type !== 'single_day' && (
                            <div className="text-xs text-gray-500 mt-1 capitalize">
                              {event.date_type.replace(/_/g, ' ')}
                            </div>
                          )}
                        </td>

                        {/* Account */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={event.account_name || 'No account'}>
                          {event.account_name || 'No account'}
                        </td>

                        {/* Status */}
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
                                Ready
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <EventQuickActionsMenu
                            eventId={event.id}
                            eventTitle={event.title || 'Untitled Event'}
                            currentStatus={event.status}
                            tenantSubdomain={tenantSubdomain}
                            onDelete={handleDeleteEvent}
                            onStatusChange={() => {
                              queryClient.invalidateQueries({ queryKey: ['events'] })
                            }}
                          />
                        </td>
                      </tr>

                      {/* Inline Tasks Row (Expandable) */}
                      {isExpanded && (
                        <tr key={`${event.id}-tasks`}>
                          <td colSpan={11} className="p-0">
                            {isLoadingTasks ? (
                              <div className="py-8 px-6 bg-gray-50 border-t border-gray-200 text-center">
                                <div className="inline-flex items-center gap-2 text-gray-600">
                                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="text-sm">Loading tasks...</span>
                                </div>
                              </div>
                            ) : (
                              <EventInlineTasks
                                eventId={event.id}
                                tasks={eventTaskCompletions[event.id] || []}
                                onTaskUpdate={handleTaskUpdate}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Events Cards - Mobile */}
          <div className="lg:hidden space-y-4">
            {/* Header for mobile */}
            <div className="bg-white shadow rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {filters.dateRangeFilter === 'all' && '📊 All Events'}
                  {filters.dateRangeFilter === 'today' && '📅 Today\'s Events'}
                  {filters.dateRangeFilter === 'this_week' && '📆 This Week\'s Events'}
                  {filters.dateRangeFilter === 'this_month' && '📅 This Month\'s Events'}
                  {filters.dateRangeFilter === 'upcoming' && '🔜 Upcoming Events'}
                  {filters.dateRangeFilter === 'past' && '📋 Past Events'}
                </h3>
                <div className="text-sm text-gray-600">
                  {sortedEvents.length} of {events.length}
                </div>
              </div>
            </div>

            {/* Empty state for mobile */}
            {sortedEvents.length === 0 && events.length > 0 && (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <p className="text-lg font-medium text-gray-900 mb-2">No events match your filters</p>
                <p className="text-sm text-gray-600">Try adjusting your date range or search criteria</p>
              </div>
            )}

            {/* Event cards */}
            {sortedEvents.map((event) => {
              const eventDateCount = event.event_dates?.length || 0
              const firstDate = event.event_dates?.[0] || null
              const displayDate = event.start_date ? formatDateShort(event.start_date) : 'No date'
              const displayLocation = firstDate?.locations?.name || event.location || 'No location'
              const daysUntil = event.start_date ? getDaysUntil(event.start_date) : null
              const incompleteTaskIds = getIncompleteTasks(event)
              const incompleteCount = incompleteTaskIds.length
              const totalTasks = coreTasks.length
              const completedTasks = totalTasks - incompleteCount
              const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

              // Determine priority level
              const getPriorityLevel = () => {
                if (daysUntil === null || daysUntil < 0) return 'none'
                if (daysUntil <= 2) return 'critical'
                if (daysUntil <= 7) return 'high'
                if (daysUntil <= 14) return 'medium'
                if (daysUntil <= 30) return 'low'
                return 'none'
              }

              const priorityLevel = getPriorityLevel()
              const priorityConfig = {
                critical: { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴', border: 'border-l-4 border-red-500', label: 'CRITICAL' },
                high: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🟠', border: 'border-l-4 border-orange-500', label: 'HIGH' },
                medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡', border: 'border-l-4 border-yellow-500', label: 'MEDIUM' },
                low: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵', border: 'border-l-4 border-blue-500', label: 'LOW' },
                none: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⚪', border: '', label: '' }
              }
              const priority = priorityConfig[priorityLevel]

              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-200 hover:shadow-lg ${priority.border}`}
                >
                  {/* Priority Header Banner */}
                  {priorityLevel !== 'none' && (
                    <div className={`${priority.bg} ${priority.text} px-4 py-2 rounded-t-lg flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{priority.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-wide">{priority.label} Priority</span>
                      </div>
                      {daysUntil !== null && daysUntil >= 0 && (
                        <span className="text-sm font-bold">
                          {isDateToday(event.start_date || '') ? 'TODAY' : `${daysUntil} DAYS`}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/${tenantSubdomain}/events/${event.id}`}>
                          <h3 className="font-semibold text-gray-900 text-base mb-1 hover:text-[#347dc4] cursor-pointer">
                            {event.title || 'Untitled Event'}
                          </h3>
                        </Link>
                        {/* Category & Type Badges */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {event.event_categories && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                borderColor: event.event_categories.color,
                                backgroundColor: event.event_categories.color + '20',
                                color: event.event_categories.color
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: event.event_categories.color }}
                              />
                              {event.event_categories.name}
                            </span>
                          )}
                          {event.event_types && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              {event.event_types.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Status Badge */}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 ${
                        event.status === 'completed' ? 'bg-green-100 text-green-800' :
                        event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status || 'Unknown'}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-2 mb-3">
                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{displayDate}</span>
                        {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isDateToday(event.start_date || '') 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isDateToday(event.start_date || '') ? 'Today' : `${daysUntil}d`}
                          </span>
                        )}
                        {eventDateCount > 1 && (
                          <span className="text-xs text-gray-500">
                            +{eventDateCount - 1} more
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-700 truncate">{displayLocation}</span>
                      </div>

                      {/* Account */}
                      {event.account_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-gray-700 truncate">{event.account_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Task Progress - Prominent Display */}
                    {totalTasks > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Task Completion
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">
                              {completedTasks}/{totalTasks}
                            </span>
                            <span className={`text-sm font-bold ${
                              taskCompletionPercentage === 100 ? 'text-green-600' :
                              taskCompletionPercentage >= 75 ? 'text-blue-600' :
                              taskCompletionPercentage >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {taskCompletionPercentage}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                              taskCompletionPercentage === 100 ? 'bg-green-500' :
                              taskCompletionPercentage >= 75 ? 'bg-blue-500' :
                              taskCompletionPercentage >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${taskCompletionPercentage}%` }}
                          />
                        </div>
                        {event.core_tasks_ready && (
                          <div className="flex items-center gap-1 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-green-700">Ready for Event</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <Link href={`/${tenantSubdomain}/events/${event.id}`} className="flex-1">
                        <button className="w-full px-3 py-2 bg-[#347dc4] text-white rounded-lg text-sm font-medium hover:bg-[#2c6ba8] transition-colors flex items-center justify-center gap-2">
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </Link>
                      <div className="flex items-center px-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <EventQuickActionsMenu
                          eventId={event.id}
                          eventTitle={event.title || 'Untitled Event'}
                          currentStatus={event.status}
                          tenantSubdomain={tenantSubdomain}
                          onDelete={handleDeleteEvent}
                          onStatusChange={() => {
                            queryClient.invalidateQueries({ queryKey: ['events'] })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <EventBulkActionsBar
        selectedCount={selectedEventIds.size}
        onClearSelection={() => setSelectedEventIds(new Set())}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkExport={handleBulkExport}
      />
    </AppLayout>
  )
}