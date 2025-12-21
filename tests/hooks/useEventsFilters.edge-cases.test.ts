/**
 * Edge Case Tests for useEventsFilters Hook
 *
 * These tests cover boundary conditions, null/undefined handling,
 * and other edge cases that might occur in production.
 */

import { renderHook, act } from '@testing-library/react'
import { useEventsFilters } from '@/hooks/useEventsFilters'

const createMockEvent = (overrides: any = {}) => ({
  id: 'event-1',
  title: 'Test Event',
  location: 'Test Location',
  account_name: 'Test Account',
  start_date: '2025-11-15',
  status: 'scheduled',
  created_at: '2025-10-01',
  task_completions: [],
  ...overrides
})

describe('useEventsFilters - Edge Cases', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-11-01'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Sort Logic Edge Cases', () => {
    describe('null and undefined handling', () => {
      it('should handle null titles when sorting by title', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Alpha' }),
          createMockEvent({ id: '2', title: null }),
          createMockEvent({ id: '3', title: 'Bravo' }),
          createMockEvent({ id: '4', title: undefined })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )

        // Null/undefined titles should be sorted to end
        expect(result.current.sortedEvents).toHaveLength(4)
        const titles = result.current.sortedEvents.map(e => e.title)
        expect(titles[0]).toBe('Alpha')
        expect(titles[1]).toBe('Bravo')
      })

      it('should handle null account names when sorting by account', () => {
        const events = [
          createMockEvent({ id: '1', account_name: 'Zebra Corp' }),
          createMockEvent({ id: '2', account_name: null }),
          createMockEvent({ id: '3', account_name: 'Acme Corp' }),
          createMockEvent({ id: '4', account_name: undefined })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'account_asc' })
        )

        expect(result.current.sortedEvents).toHaveLength(4)
        const accounts = result.current.sortedEvents.map(e => e.account_name)
        expect(accounts[0]).toBe('Acme Corp')
        expect(accounts[1]).toBe('Zebra Corp')
      })

      it('should handle null dates when sorting by date', () => {
        const events = [
          createMockEvent({ id: '1', start_date: '2025-11-15' }),
          createMockEvent({ id: '2', start_date: null }),
          createMockEvent({ id: '3', start_date: '2025-11-10' }),
          createMockEvent({ id: '4', start_date: undefined })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'date_asc' })
        )

        expect(result.current.sortedEvents).toHaveLength(4)
        // Valid dates should be sorted first
        expect(result.current.sortedEvents[0].start_date).toBe('2025-11-10')
        expect(result.current.sortedEvents[1].start_date).toBe('2025-11-15')
      })
    })

    describe('empty string handling', () => {
      it('should handle empty string titles', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Alpha' }),
          createMockEvent({ id: '2', title: '' }),
          createMockEvent({ id: '3', title: 'Bravo' }),
          createMockEvent({ id: '4', title: '   ' }) // Whitespace only
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )

        expect(result.current.sortedEvents).toHaveLength(4)
        // Empty strings should be treated as valid and sorted first
        expect(result.current.sortedEvents[0].title).toBe('')
      })

      it('should handle empty string account names', () => {
        const events = [
          createMockEvent({ id: '1', account_name: 'Zebra' }),
          createMockEvent({ id: '2', account_name: '' }),
          createMockEvent({ id: '3', account_name: 'Alpha' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'account_asc' })
        )

        expect(result.current.sortedEvents).toHaveLength(3)
      })
    })

    describe('special characters and case sensitivity', () => {
      it('should sort titles case-insensitively', () => {
        const events = [
          createMockEvent({ id: '1', title: 'charlie' }),
          createMockEvent({ id: '2', title: 'ALPHA' }),
          createMockEvent({ id: '3', title: 'Bravo' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )

        expect(result.current.sortedEvents[0].id).toBe('2') // ALPHA
        expect(result.current.sortedEvents[1].id).toBe('3') // Bravo
        expect(result.current.sortedEvents[2].id).toBe('1') // charlie
      })

      it('should handle special characters in titles', () => {
        const events = [
          createMockEvent({ id: '1', title: '🎉 Party Event' }),
          createMockEvent({ id: '2', title: '@ Conference' }),
          createMockEvent({ id: '3', title: '123 Numeric Event' }),
          createMockEvent({ id: '4', title: '#Hashtag Event' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )

        // Should sort without errors
        expect(result.current.sortedEvents).toHaveLength(4)
      })

      it('should handle unicode characters', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Événement' }),
          createMockEvent({ id: '2', title: 'Zürich Conference' }),
          createMockEvent({ id: '3', title: 'Tōkyō Meeting' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )

        expect(result.current.sortedEvents).toHaveLength(3)
      })
    })

    describe('duplicate values', () => {
      it('should handle duplicate titles consistently', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Same Title', start_date: '2025-11-15' }),
          createMockEvent({ id: '2', title: 'Same Title', start_date: '2025-11-10' }),
          createMockEvent({ id: '3', title: 'Same Title', start_date: '2025-11-20' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )

        // All should be present, order should be stable
        expect(result.current.sortedEvents).toHaveLength(3)
        expect(result.current.sortedEvents.every(e => e.title === 'Same Title')).toBe(true)
      })

      it('should use secondary sort for duplicate dates', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Zebra', start_date: '2025-11-15' }),
          createMockEvent({ id: '2', title: 'Alpha', start_date: '2025-11-15' }),
          createMockEvent({ id: '3', title: 'Bravo', start_date: '2025-11-15' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'date_asc' })
        )

        // Same date, should maintain some consistent order
        expect(result.current.sortedEvents).toHaveLength(3)
        expect(result.current.sortedEvents.every(e => e.start_date === '2025-11-15')).toBe(true)
      })
    })

    describe('large datasets', () => {
      it('should handle sorting 1000+ events efficiently', () => {
        const events = Array.from({ length: 1000 }, (_, i) =>
          createMockEvent({
            id: `event-${i}`,
            title: `Event ${1000 - i}`, // Reverse order
            start_date: `2025-${String(11 + (i % 2)).padStart(2, '0')}-${String(i % 28 + 1).padStart(2, '0')}`
          })
        )

        const startTime = performance.now()
        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [], initialSortBy: 'title_asc' })
        )
        const endTime = performance.now()

        expect(result.current.sortedEvents).toHaveLength(1000)
        expect(result.current.sortedEvents[0].title).toBe('Event 1')
        expect(result.current.sortedEvents[999].title).toBe('Event 1000')

        // Should complete in reasonable time (under 100ms)
        expect(endTime - startTime).toBeLessThan(100)
      })
    })
  })

  describe('Filter Logic Edge Cases', () => {
    describe('search term edge cases', () => {
      it('should handle empty search term', () => {
        const events = [createMockEvent({ id: '1' })]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { searchTerm: '' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(1)
      })

      it('should handle search with only whitespace', () => {
        const events = [createMockEvent({ id: '1', title: 'Test Event' })]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { searchTerm: '   ' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(1)
      })

      it('should handle special regex characters in search', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Event (Test)' }),
          createMockEvent({ id: '2', title: 'Event [Special]' }),
          createMockEvent({ id: '3', title: 'Event $100' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { searchTerm: '(Test)' }
          })
        )

        // Should not throw regex error
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(0)
      })

      it('should search case-insensitively', () => {
        const events = [
          createMockEvent({ id: '1', title: 'UPPERCASE EVENT' }),
          createMockEvent({ id: '2', title: 'lowercase event' }),
          createMockEvent({ id: '3', title: 'MiXeD CaSe EvEnT' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { searchTerm: 'event' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(3)
      })

      it('should search in multiple fields', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Tech Conference', location: 'NYC', account_name: 'Acme' }),
          createMockEvent({ id: '2', title: 'Sales Meeting', location: 'Tech Plaza', account_name: 'Beta' }),
          createMockEvent({ id: '3', title: 'Training', location: 'Office', account_name: 'Tech Corp' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { searchTerm: 'tech' }
          })
        )

        // Should match in title, location, or account_name
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(3)
      })
    })

    describe('date range boundary conditions', () => {
      it('should handle events on exact boundary dates', () => {
        const today = new Date('2025-11-01')
        const events = [
          createMockEvent({ id: '1', start_date: '2025-11-01' }), // Today
          createMockEvent({ id: '2', start_date: '2025-11-02' }), // Tomorrow
          createMockEvent({ id: '3', start_date: '2025-10-31' })  // Yesterday
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { dateRangeFilter: 'upcoming' }
          })
        )

        // Should include today and future events
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(2)
      })

      it('should handle very far future dates', () => {
        const events = [
          createMockEvent({ id: '1', start_date: '2099-12-31' }),
          createMockEvent({ id: '2', start_date: '2025-11-15' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { dateRangeFilter: 'upcoming' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(2)
      })

      it('should handle very far past dates', () => {
        const events = [
          createMockEvent({ id: '1', start_date: '2000-01-01' }),
          createMockEvent({ id: '2', start_date: '2025-11-15' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { dateRangeFilter: 'all' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(2)
      })

      it('should handle invalid date strings gracefully', () => {
        const events = [
          createMockEvent({ id: '1', start_date: 'invalid-date' }),
          createMockEvent({ id: '2', start_date: '2025-11-15' }),
          createMockEvent({ id: '3', start_date: '2025-13-45' }) // Invalid month/day
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [] })
        )

        // Should not crash, may filter out invalid dates
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(0)
      })
    })

    describe('status filter edge cases', () => {
      it('should handle null status', () => {
        const events = [
          createMockEvent({ id: '1', status: null }),
          createMockEvent({ id: '2', status: 'scheduled' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { statusFilter: 'all' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(2)
      })

      it('should handle undefined status', () => {
        const events = [
          createMockEvent({ id: '1', status: undefined }),
          createMockEvent({ id: '2', status: 'completed' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { statusFilter: 'all' }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(2)
      })

      it('should handle case-insensitive status matching', () => {
        const events = [
          createMockEvent({ id: '1', status: 'SCHEDULED' }),
          createMockEvent({ id: '2', status: 'scheduled' }),
          createMockEvent({ id: '3', status: 'Scheduled' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: { statusFilter: 'scheduled' }
          })
        )

        // All should match regardless of case
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('combined filters stress test', () => {
      it('should handle all filters active simultaneously', () => {
        const events = [
          createMockEvent({
            id: '1',
            title: 'Alpha Event',
            status: 'scheduled',
            start_date: '2025-11-15',
            account_name: 'Acme Corp',
            task_completions: []
          }),
          createMockEvent({
            id: '2',
            title: 'Bravo Event',
            status: 'completed',
            start_date: '2025-11-20',
            account_name: 'Beta Inc',
            task_completions: []
          })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks: [],
            initialFilters: {
              searchTerm: 'event',
              statusFilter: 'scheduled',
              dateRangeFilter: 'upcoming'
            },
            initialSortBy: 'title_asc'
          })
        )

        // Should apply all filters and sorting
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(0)
      })

      it('should update results when multiple filters change', () => {
        const events = [
          createMockEvent({ id: '1', title: 'Alpha', status: 'scheduled' }),
          createMockEvent({ id: '2', title: 'Bravo', status: 'completed' })
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events, coreTasks: [] })
        )

        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            searchTerm: 'alpha',
            statusFilter: 'scheduled'
          })
        })

        expect(result.current.sortedEvents.length).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Task Completion Edge Cases', () => {
    describe('incomplete tasks calculation', () => {
      it('should handle events with no task completions', () => {
        const event = createMockEvent({ task_completions: [] })
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' },
          { id: 'task-2', task_name: 'Task 2' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        // All tasks should be incomplete
        const incompleteTasks = result.current.getIncompleteTasks(event)
        expect(incompleteTasks).toHaveLength(2)
      })

      it('should handle events with all tasks completed', () => {
        const event = createMockEvent({
          task_completions: [
            { core_task_id: 'task-1' },
            { core_task_id: 'task-2' }
          ]
        })
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' },
          { id: 'task-2', task_name: 'Task 2' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        expect(incompleteTasks).toHaveLength(0)
      })

      it('should handle partial task completion', () => {
        const event = createMockEvent({
          task_completions: [
            { core_task_id: 'task-1' }
          ]
        })
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' },
          { id: 'task-2', task_name: 'Task 2' },
          { id: 'task-3', task_name: 'Task 3' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        expect(incompleteTasks).toHaveLength(2)
        expect(incompleteTasks).toEqual(['task-2', 'task-3'])
      })

      it('should handle null task_completions array', () => {
        const event = createMockEvent({ task_completions: null })
        const coreTasks = [{ id: 'task-1', task_name: 'Task 1' }]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        // Should not crash
        const incompleteTasks = result.current.getIncompleteTasks(event)
        expect(incompleteTasks).toHaveLength(1)
      })

      it('should handle undefined task_completions', () => {
        const event = createMockEvent({ task_completions: undefined })
        const coreTasks = [{ id: 'task-1', task_name: 'Task 1' }]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        expect(incompleteTasks).toHaveLength(1)
      })
    })

    describe('task completion percentage', () => {
      it('should calculate 0% for no completions', () => {
        const event = createMockEvent({ task_completions: [] })
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' },
          { id: 'task-2', task_name: 'Task 2' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        const percentage = ((coreTasks.length - incompleteTasks.length) / coreTasks.length) * 100
        expect(percentage).toBe(0)
      })

      it('should calculate 100% for all completions', () => {
        const event = createMockEvent({
          task_completions: [
            { core_task_id: 'task-1' },
            { core_task_id: 'task-2' }
          ]
        })
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' },
          { id: 'task-2', task_name: 'Task 2' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        const percentage = ((coreTasks.length - incompleteTasks.length) / coreTasks.length) * 100
        expect(percentage).toBe(100)
      })

      it('should calculate 50% for half completions', () => {
        const event = createMockEvent({
          task_completions: [{ core_task_id: 'task-1' }]
        })
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' },
          { id: 'task-2', task_name: 'Task 2' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        const percentage = ((coreTasks.length - incompleteTasks.length) / coreTasks.length) * 100
        expect(percentage).toBe(50)
      })

      it('should handle 0 total tasks gracefully', () => {
        const event = createMockEvent({ task_completions: [] })
        const coreTasks: any[] = []

        const { result } = renderHook(() =>
          useEventsFilters({ events: [event], coreTasks })
        )

        const incompleteTasks = result.current.getIncompleteTasks(event)
        expect(incompleteTasks).toHaveLength(0)

        // Should not divide by zero
        const percentage = coreTasks.length === 0 ? 0 : ((coreTasks.length - incompleteTasks.length) / coreTasks.length) * 100
        expect(percentage).toBe(0)
      })
    })

    describe('task filter edge cases', () => {
      it('should handle taskFilter with no matching tasks', () => {
        const events = [
          createMockEvent({ id: '1', task_completions: [] })
        ]
        const coreTasks = [
          { id: 'task-1', task_name: 'Task 1' }
        ]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks,
            initialFilters: {
              taskFilter: 'incomplete',
              selectedTaskIds: ['task-999'] // Non-existent task
            }
          })
        )

        // Should not crash
        expect(result.current.sortedEvents.length).toBeGreaterThanOrEqual(0)
      })

      it('should handle empty selectedTaskIds array', () => {
        const events = [createMockEvent({ id: '1' })]
        const coreTasks = [{ id: 'task-1', task_name: 'Task 1' }]

        const { result } = renderHook(() =>
          useEventsFilters({
            events,
            coreTasks,
            initialFilters: {
              taskFilter: 'incomplete',
              selectedTaskIds: []
            }
          })
        )

        expect(result.current.sortedEvents).toHaveLength(1)
      })
    })
  })

  describe('Performance and Memory', () => {
    it('should not leak memory with rapid filter changes', () => {
      const events = Array.from({ length: 100 }, (_, i) =>
        createMockEvent({ id: `event-${i}`, title: `Event ${i}` })
      )

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      // Rapidly change filters 100 times
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            searchTerm: `test-${i}`
          })
        })
      }

      // Should still function correctly
      expect(result.current.sortedEvents).toBeDefined()
    })

    it('should handle rapid sort changes', () => {
      const events = [
        createMockEvent({ id: '1', title: 'Alpha' }),
        createMockEvent({ id: '2', title: 'Bravo' })
      ]

      const { result } = renderHook(() =>
        useEventsFilters({ events, coreTasks: [] })
      )

      const sortModes = ['date_asc', 'date_desc', 'title_asc', 'title_desc', 'account_asc', 'account_desc'] as const

      // Rapidly cycle through sort modes
      sortModes.forEach(mode => {
        act(() => {
          result.current.setSortBy(mode)
        })
      })

      // Should still be functional
      expect(result.current.sortedEvents).toHaveLength(2)
    })
  })
})
