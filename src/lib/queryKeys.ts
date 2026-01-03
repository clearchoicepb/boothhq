/**
 * Centralized React Query Keys for the Events Module
 *
 * This file provides a single source of truth for all query keys used in the
 * Events Module, ensuring consistency and preventing typos.
 *
 * ## Key Naming Convention
 *
 * All query keys follow this pattern:
 * - `['event-<resource>', ...identifiers]`
 *
 * Where:
 * - `event-<resource>` is dash-separated and describes the specific resource
 * - `identifiers` are additional parameters like eventId, page, etc.
 *
 * ## Examples
 * ```typescript
 * // List queries (no identifier)
 * queryKeys.events.list()                    // ['events']
 *
 * // Detail queries (with eventId)
 * queryKeys.events.detail(eventId)           // ['event-detail', eventId]
 * queryKeys.events.staff(eventId)            // ['event-staff', eventId]
 * queryKeys.events.invoices(eventId)         // ['event-invoices', eventId]
 *
 * // Paginated queries
 * queryKeys.events.communications(eventId, page)  // ['event-communications', eventId, page]
 * ```
 *
 * ## Why Centralized Keys?
 * - Prevents typos in query keys
 * - Ensures consistency across the application
 * - Makes refactoring easier
 * - Provides auto-completion support
 * - Serves as documentation for all queries
 */

/**
 * Events Module Query Keys
 *
 * All keys related to events, event dates, tasks, staff, communications, etc.
 */
export const queryKeys = {
  /**
   * Tasks and related resources
   */
  tasks: {
    /**
     * All tasks list
     * @returns ['tasks']
     */
    list: () => ['tasks'] as const,

    /**
     * Single task detail
     * @param taskId - Task UUID
     * @returns ['tasks', taskId]
     */
    detail: (taskId: string) => ['tasks', taskId] as const,

    /**
     * Task notes (progress updates)
     * @param taskId - Task UUID
     * @returns ['task-notes', taskId]
     */
    notes: (taskId: string) => ['task-notes', taskId] as const,
  },

  /**
   * Event Forms (cross-event listing)
   */
  eventForms: {
    /**
     * All event forms list (with optional status filter)
     * @param status - Optional status filter ('completed', 'pending', 'all')
     * @returns ['event-forms'] or ['event-forms', status]
     */
    list: (status?: string) =>
      status ? (['event-forms', status] as const) : (['event-forms'] as const),

    /**
     * Forms for a specific event
     * @param eventId - Event UUID
     * @returns ['event-forms', 'event', eventId]
     */
    byEvent: (eventId: string) => ['event-forms', 'event', eventId] as const,
  },

  /**
   * Events and related resources
   */
  events: {
    /**
     * All events list
     * @returns ['events']
     */
    list: () => ['events'] as const,

    /**
     * Single event detail
     * @param eventId - Event UUID
     * @returns ['event-detail', eventId]
     */
    detail: (eventId: string) => ['event-detail', eventId] as const,

    /**
     * Event dates for a specific event
     * @param eventId - Event UUID
     * @returns ['event-dates', eventId]
     */
    dates: (eventId: string) => ['event-dates', eventId] as const,

    /**
     * Event staff assignments
     * @param eventId - Event UUID
     * @returns ['event-staff', eventId]
     */
    staff: (eventId: string) => ['event-staff', eventId] as const,

    /**
     * Event invoices
     * @param eventId - Event UUID
     * @returns ['event-invoices', eventId]
     */
    invoices: (eventId: string) => ['event-invoices', eventId] as const,

    /**
     * Event logistics
     * @param eventId - Event UUID
     * @returns ['event-logistics', eventId]
     */
    logistics: (eventId: string) => ['event-logistics', eventId] as const,

    /**
     * Event activities log
     * @param eventId - Event UUID
     * @returns ['event-activities', eventId]
     */
    activities: (eventId: string) => ['event-activities', eventId] as const,

    /**
     * Event attachments
     * @param eventId - Event UUID
     * @returns ['event-attachments', eventId]
     */
    attachments: (eventId: string) => ['event-attachments', eventId] as const,

    /**
     * Event communications (paginated)
     * @param eventId - Event UUID
     * @param page - Page number (optional)
     * @returns ['event-communications', eventId] or ['event-communications', eventId, page]
     */
    communications: (eventId: string, page?: number) =>
      page !== undefined
        ? (['event-communications', eventId, page] as const)
        : (['event-communications', eventId] as const),

    /**
     * Task status for events
     * @param eventIds - Optional array of event IDs (if filtering)
     * @returns ['event-task-status'] or ['event-task-status', eventIds]
     */
    taskStatus: (eventIds?: string[]) =>
      eventIds
        ? (['event-task-status', eventIds] as const)
        : (['event-task-status'] as const),

    /**
     * Event reference data (accounts, contacts, locations, etc.)
     * These are scoped to event context to avoid conflicts with other modules
     */
    references: {
      /**
       * All accounts (for dropdown/selection)
       * @returns ['event-references', 'accounts']
       */
      accounts: () => ['event-references', 'accounts'] as const,

      /**
       * All contacts (for dropdown/selection)
       * @returns ['event-references', 'contacts']
       */
      contacts: () => ['event-references', 'contacts'] as const,

      /**
       * All locations (for dropdown/selection)
       * @returns ['event-references', 'locations']
       */
      locations: () => ['event-references', 'locations'] as const,

      /**
       * Payment status options
       * @returns ['event-references', 'payment-status-options']
       */
      paymentStatusOptions: () => ['event-references', 'payment-status-options'] as const,
    },
  },
};

/**
 * Type-safe query key helpers
 *
 * These types ensure that query keys are used correctly throughout the application
 */
export type EventsQueryKey = ReturnType<typeof queryKeys.events.list>;
export type EventDetailQueryKey = ReturnType<typeof queryKeys.events.detail>;
export type EventDatesQueryKey = ReturnType<typeof queryKeys.events.dates>;
export type EventStaffQueryKey = ReturnType<typeof queryKeys.events.staff>;
export type EventInvoicesQueryKey = ReturnType<typeof queryKeys.events.invoices>;
export type EventLogisticsQueryKey = ReturnType<typeof queryKeys.events.logistics>;
export type EventActivitiesQueryKey = ReturnType<typeof queryKeys.events.activities>;
export type EventAttachmentsQueryKey = ReturnType<typeof queryKeys.events.attachments>;
export type EventCommunicationsQueryKey = ReturnType<typeof queryKeys.events.communications>;
export type EventTaskStatusQueryKey = ReturnType<typeof queryKeys.events.taskStatus>;
export type EventFormsListQueryKey = ReturnType<typeof queryKeys.eventForms.list>;
export type EventFormsByEventQueryKey = ReturnType<typeof queryKeys.eventForms.byEvent>;

/**
 * Query Key Invalidation Helpers
 *
 * Use these when you need to invalidate specific queries after mutations
 */
export const invalidationHelpers = {
  /**
   * Invalidate all event-related queries
   * Use this after major changes that could affect multiple event resources
   */
  invalidateAllEvents: () => [
    ['events'],
    ['event-detail'],
    ['event-dates'],
    ['event-staff'],
    ['event-invoices'],
    ['event-logistics'],
    ['event-activities'],
    ['event-attachments'],
    ['event-communications'],
    ['event-task-status'],
  ],

  /**
   * Invalidate a specific event and all its related resources
   * Use this after updating a single event
   */
  invalidateEvent: (eventId: string) => [
    ['event-detail', eventId],
    ['event-dates', eventId],
    ['event-staff', eventId],
    ['event-invoices', eventId],
    ['event-logistics', eventId],
    ['event-activities', eventId],
    ['event-attachments', eventId],
    ['event-communications', eventId],
  ],
};

/**
 * Migration Notes
 *
 * Old keys → New keys (for reference during refactoring):
 *
 * ✓ ['events'] → ['events'] (no change)
 * ✗ ['event', eventId] → ['event-detail', eventId]
 * ✗ ['events-task-status', eventIds] → ['event-task-status', eventIds]
 * ✓ ['event-staff', eventId] → ['event-staff', eventId] (no change)
 * ✓ ['event-invoices', eventId] → ['event-invoices', eventId] (no change)
 * ✓ ['event-logistics', eventId] → ['event-logistics', eventId] (no change)
 * ✓ ['event-activities', eventId] → ['event-activities', eventId] (no change)
 * ✓ ['event-attachments', eventId] → ['event-attachments', eventId] (no change)
 * ✓ ['event-communications', eventId, page] → ['event-communications', eventId, page] (no change)
 * ✓ ['event-dates', eventId] → ['event-dates', eventId] (no change)
 * ✗ ['accounts'] → ['event-references', 'accounts']
 * ✗ ['contacts'] → ['event-references', 'contacts']
 * ✗ ['locations'] → ['event-references', 'locations']
 * ✗ ['payment-status-options'] → ['event-references', 'payment-status-options']
 */
