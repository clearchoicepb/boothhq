/**
 * Unit tests for useEventsFilters hook
 */

import { renderHook, act } from '@testing-library/react'
import { useEventsFilters } from '@/hooks/useEventsFilters'
import type { FilterState } from '@/components/events/event-filters'

// Mock data
const mockCoreTasks = [
  { id: 'task-1', task_name: 'Design Mockup' },
  { id: 'task-2', task_name: 'Client Approval' },
  { id: 'task-3', task_name: 'Final Setup' }
]

const createMockEvent = (overrides: any = {}) => ({
  id: 'event-1',
  title: 'Test Event',
  location: 'Test Location',
  account_name: 'Test Account',
  start_date: '2025-11-15',
  created_at: '2025-10-01',
  task_completions: [],
  ...overrides
})

describe('useEventsFilters', () => {
  beforeEach(() => {
    // Mock current date to ensure consistent test results
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-11-01'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('initial state', () => {
    it('should initialize with default filters', () => {
      const { result } = renderHook(() =>
        useEventsFilters({ events: [], coreTasks: [] })
      )

      expect(result.current.filters).toEqual({
        searchTerm: '',
        dateRangeFilter: 'upcoming',
        customDaysFilter: null,
        taskFilter: 'all',
        taskDateRangeFilter: 14,
        selectedTaskIds: [],
        assignedToFilter: 'all'
      })
    })

    it('should initialize with custom filters', () => {
      const initialFilters: Partial<FilterState> = {
        searchTerm: 'test',
        taskFilter: 'incomplete'
      }

      const { result } = renderHook(() =>
        useEventsFilters({
          events: [],
          coreTasks: [],
          initialFilters
        })
      )

      expect(result.current.filters.searchTerm).toBe('test')
      expect(result.current.filters.taskFilter).toBe('incomplete')
    })

    it('should initialize with default sortBy', () => {
      const { result } = renderHook(() =>
        useEventsFilters({ events: [], coreTasks: [] })
      )

      expect(result.current.sortBy).toBe('date_asc')
    })

    it('should initialize with custom sortBy', () => {
      const { result } = renderHook(() =>
        useEventsFilters({
          events: [],
          coreTasks: [],
          initialSortBy: 'title_desc'
        })
      )

      expect(result.current.sortBy).toBe('title_desc')
    })
  })

  describe('getIncompleteTasks', () => {
    it('should return empty array when no core tasks exist', () => {
      const event = createMockEvent()
      const { result } = renderHook(() =>
        useEventsFilters({ events: [event], coreTasks: [] })
      )

      const incompleteTasks = result.current.getIncompleteTasks(event)
      expect(incompleteTasks).toEqual([])
    })

    it('should return all tasks when event has no task_completions', () => {
      const event = createMockEvent({ task_completions: [] })
      const { result } = renderHook(() =>
        useEventsFilters({ events: [event], coreTasks: mockCoreTasks })
      )

      const incompleteTasks = result.current.getIncompleteTasks(event)
      expect(incompleteTasks).toEqual(['task-1', 'task-2', 'task-3'])
    })

    it('should return all tasks when task_completions is undefined', () => {
      const event = createMockEvent({ task_completions: undefined })
      const { result } = renderHook(() =>
        useEventsFilters({ events: [event], coreTasks: mockCoreTasks })
      )

      const incompleteTasks = result.current.getIncompleteTasks(event)
      expect(incompleteTasks).toEqual(['task-1', 'task-2', 'task-3'])
    })

    it('should return only incomplete tasks', () => {
      const event = createMockEvent({
        task_completions: [
          { core_task_template_id: 'task-1', is_completed: true },
          { core_task_template_id: 'task-2', is_completed: false }
        ]
      })

      const { result } = renderHook(() =>
        useEventsFilters({ events: [event], coreTasks: mockCoreTasks })
      )

      const incompleteTasks = result.current.getIncompleteTasks(event)
      expect(incompleteTasks).toEqual(['task-2', 'task-3'])
    })

    it('should return empty array when all tasks are completed', () => {
      const event = createMockEvent({
        task_completions: [
          { core_task_template_id: 'task-1', is_completed: true },
          { core_task_template_id: 'task-2', is_completed: true },
          { core_task_template_id: 'task-3', is_completed: true }
        ]
      })

      const { result } = renderHook(() =>
        useEventsFilters({ events: [event], coreTasks: mockCoreTasks })
      )

      const incompleteTasks = result.current.getIncompleteTasks(event)
      expect(incompleteTasks).toEqual([])
    })
  })

  describe('search filter', () => {
    it('should filter by title', () => {
      const events = [
        createMockEvent({ id: '1', title: 'Birthday Party' }),
        createMockEvent({ id: '2', title: 'Wedding Reception' }),
        createMockEvent({ id: '3', title: 'Corporate Event' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchTerm: 'birthday'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('1')
    })

    it('should filter by location', () => {
      const events = [
        createMockEvent({ id: '1', location: 'New York' }),
        createMockEvent({ id: '2', location: 'Los Angeles' }),
        createMockEvent({ id: '3', location: 'New Jersey' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchTerm: 'new'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)
    })

    it('should filter by account name', () => {
      const events = [
        createMockEvent({ id: '1', account_name: 'Acme Corp' }),
        createMockEvent({ id: '2', account_name: 'TechCo' }),
        createMockEvent({ id: '3', account_name: 'Acme Industries' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchTerm: 'acme'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)
    })

    it('should be case insensitive', () => {
      const events = [createMockEvent({ title: 'Birthday Party' })]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchTerm: 'BIRTHDAY'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(1)
    })
  })

  describe('date range filter', () => {
    it('should filter upcoming events', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }), // Future
        createMockEvent({ id: '2', start_date: '2025-10-15' }), // Past
        createMockEvent({ id: '3', start_date: '2025-12-01' })  // Future
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          dateRangeFilter: 'upcoming'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)
    })

    it('should filter past events', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }), // Future
        createMockEvent({ id: '2', start_date: '2025-10-15' }), // Past
        createMockEvent({ id: '3', start_date: '2025-09-01' })  // Past
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          dateRangeFilter: 'past'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)
    })

    it('should filter events for this month', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }), // This month
        createMockEvent({ id: '2', start_date: '2025-10-15' }), // Last month
        createMockEvent({ id: '3', start_date: '2025-12-01' })  // Next month
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          dateRangeFilter: 'this_month'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(1)
      expect(result.current.filteredEvents[0].id).toBe('1')
    })
  })

  describe('sorting', () => {
    it('should sort by date ascending', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }),
        createMockEvent({ id: '2', start_date: '2025-11-10' }),
        createMockEvent({ id: '3', start_date: '2025-11-20' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [], initialSortBy: 'date_asc' })
      )

      expect(result.current.sortedEvents[0].id).toBe('2')
      expect(result.current.sortedEvents[1].id).toBe('1')
      expect(result.current.sortedEvents[2].id).toBe('3')
    })

    it('should sort by date descending', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }),
        createMockEvent({ id: '2', start_date: '2025-11-10' }),
        createMockEvent({ id: '3', start_date: '2025-11-20' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [], initialSortBy: 'date_desc' })
      )

      expect(result.current.sortedEvents[0].id).toBe('3')
      expect(result.current.sortedEvents[1].id).toBe('1')
      expect(result.current.sortedEvents[2].id).toBe('2')
    })

    it('should sort by title A-Z', () => {
      const events = [
        createMockEvent({ id: '1', title: 'Charlie Event' }),
        createMockEvent({ id: '2', title: 'Alpha Event' }),
        createMockEvent({ id: '3', title: 'Bravo Event' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
      )

      expect(result.current.sortedEvents[0].id).toBe('2')
      expect(result.current.sortedEvents[1].id).toBe('3')
      expect(result.current.sortedEvents[2].id).toBe('1')
    })

    it('should sort by title Z-A', () => {
      const events = [
        createMockEvent({ id: '1', title: 'Charlie Event' }),
        createMockEvent({ id: '2', title: 'Alpha Event' }),
        createMockEvent({ id: '3', title: 'Bravo Event' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_desc' })
      )

      expect(result.current.sortedEvents[0].id).toBe('1')
      expect(result.current.sortedEvents[1].id).toBe('3')
      expect(result.current.sortedEvents[2].id).toBe('2')
    })

    it('should sort by account A-Z', () => {
      const events = [
        createMockEvent({ id: '1', account_name: 'Zebra Corp' }),
        createMockEvent({ id: '2', account_name: 'Acme Corp' }),
        createMockEvent({ id: '3', account_name: 'Beta Inc' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [], initialSortBy: 'account_asc' })
      )

      expect(result.current.sortedEvents[0].id).toBe('2')
      expect(result.current.sortedEvents[1].id).toBe('3')
      expect(result.current.sortedEvents[2].id).toBe('1')
    })

    it('should allow changing sort dynamically', () => {
      const events = [
        createMockEvent({ id: '1', title: 'Bravo' }),
        createMockEvent({ id: '2', title: 'Alpha' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
      )

      expect(result.current.sortedEvents[0].id).toBe('2')

      act(() => {
        result.current.setSortBy('title_desc')
      })

      expect(result.current.sortedEvents[0].id).toBe('1')
    })
  })

  describe('event counts', () => {
    it('should calculate total count', () => {
      const events = [
        createMockEvent({ id: '1' }),
        createMockEvent({ id: '2' }),
        createMockEvent({ id: '3' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      expect(result.current.eventCounts.total).toBe(3)
    })

    it('should calculate filtered count', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }), // Future
        createMockEvent({ id: '2', start_date: '2025-10-15' }), // Past
        createMockEvent({ id: '3', start_date: '2025-11-20' })  // Future
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      // Default filter is 'upcoming', so only future events should be filtered
      expect(result.current.eventCounts.filtered).toBe(2)
    })

    it('should calculate upcoming count', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }), // Future
        createMockEvent({ id: '2', start_date: '2025-10-15' }), // Past
        createMockEvent({ id: '3', start_date: '2025-12-01' })  // Future
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      expect(result.current.eventCounts.upcoming).toBe(2)
    })

    it('should calculate past count', () => {
      const events = [
        createMockEvent({ id: '1', start_date: '2025-11-15' }), // Future
        createMockEvent({ id: '2', start_date: '2025-10-15' }), // Past
        createMockEvent({ id: '3', start_date: '2025-09-01' })  // Past
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      expect(result.current.eventCounts.past).toBe(2)
    })
  })

  describe('combined filters', () => {
    it('should apply multiple filters together', () => {
      const events = [
        createMockEvent({ id: '1', title: 'Birthday Party', start_date: '2025-11-15' }),
        createMockEvent({ id: '2', title: 'Birthday Celebration', start_date: '2025-11-20' }),
        createMockEvent({ id: '3', title: 'Wedding', start_date: '2025-11-25' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchTerm: 'birthday',
          dateRangeFilter: 'upcoming'
        })
      })

      expect(result.current.filteredEvents).toHaveLength(2)
    })
  })
})
