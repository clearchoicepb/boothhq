import { GenericRepository } from './GenericRepository'
import type { Event } from '@/lib/supabase-client'
import { eventValidator } from '@/lib/validators/EventValidator'

export class EventRepository extends GenericRepository<Event> {
  constructor() {
    super('events')
  }

  /**
   * Find events by date range
   */
  async findByDateRange(
    startDate: string, 
    endDate: string, 
    tenantId: string
  ): Promise<Event[]> {
    return this.findMany(tenantId, {
      where: {
        start_date: { gte: startDate },
        end_date: { lte: endDate }
      },
      orderBy: { field: 'start_date', direction: 'asc' }
    })
  }

  /**
   * Find upcoming events
   */
  async findUpcoming(tenantId: string, limit: number = 10): Promise<Event[]> {
    const now = new Date().toISOString()
    return this.findMany(tenantId, {
      where: {
        start_date: { gte: now },
        status: 'upcoming'
      },
      orderBy: { field: 'start_date', direction: 'asc' },
      limit
    })
  }

  /**
   * Find events by account ID
   */
  async findByAccountId(accountId: string, tenantId: string): Promise<Event[]> {
    return this.findMany(tenantId, {
      where: { account_id: accountId },
      orderBy: { field: 'start_date', direction: 'desc' }
    })
  }

  /**
   * Find events by contact ID
   */
  async findByContactId(contactId: string, tenantId: string): Promise<Event[]> {
    return this.findMany(tenantId, {
      where: { contact_id: contactId },
      orderBy: { field: 'start_date', direction: 'desc' }
    })
  }

  /**
   * Find events by type
   */
  async findByType(eventType: string, tenantId: string): Promise<Event[]> {
    return this.findMany(tenantId, {
      where: { event_type: eventType },
      orderBy: { field: 'start_date', direction: 'desc' }
    })
  }

  /**
   * Search events by title, description, or location
   */
  async searchEvents(query: string, tenantId: string, limit: number = 50): Promise<Event[]> {
    return this.search(tenantId, {
      query,
      fields: ['title', 'description', 'location'],
      fuzzy: true
    }, { limit })
  }

  /**
   * Get events with their associated accounts and contacts
   */
  async findWithRelations(tenantId: string, options?: { limit?: number; offset?: number }): Promise<Event[]> {
    return this.findMany(tenantId, {
      include: ['accounts', 'contacts'],
      limit: options?.limit,
      offset: options?.offset,
      orderBy: { field: 'start_date', direction: 'desc' }
    })
  }

  /**
   * Get event statistics
   */
  async getStats(tenantId: string): Promise<{
    total: number
    upcoming: number
    completed: number
    cancelled: number
    byType: Record<string, number>
    thisMonth: number
    nextMonth: number
  }> {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

    const [
      total,
      upcoming,
      completed,
      cancelled,
      thisMonth,
      nextMonth
    ] = await Promise.all([
      this.count(tenantId),
      this.count(tenantId, { status: 'upcoming' }),
      this.count(tenantId, { status: 'completed' }),
      this.count(tenantId, { status: 'cancelled' }),
      this.count(tenantId, {
        start_date: { gte: thisMonthStart, lte: thisMonthEnd }
      }),
      this.count(tenantId, {
        start_date: { gte: nextMonthStart, lte: nextMonthEnd }
      })
    ])

    // Get events by type
    const events = await this.findMany(tenantId)
    const byType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      upcoming,
      completed,
      cancelled,
      byType,
      thisMonth,
      nextMonth
    }
  }

  /**
   * Create event with validation
   *
   * Uses EventValidator for business rule validation.
   * This keeps the repository focused on data access only.
   */
  async createEvent(data: {
    title: string
    description?: string
    event_type: string
    start_date: string
    end_date?: string
    location?: string
    account_id?: string
    contact_id?: string
    status?: string
  }, tenantId: string): Promise<Event> {
    // Validate using EventValidator
    const validationResult = eventValidator.validateCreate(data);

    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join('; '));
    }

    return this.create({
      ...data,
      status: data.status || 'upcoming'
    }, tenantId)
  }

  /**
   * Update event with validation
   *
   * Uses EventValidator for business rule validation.
   * This keeps the repository focused on data access only.
   */
  async updateEvent(id: string, data: Partial<Event>, tenantId: string): Promise<Event> {
    // Optionally fetch existing event for context-aware validation
    // (e.g., validating end_date against existing start_date)
    let existingEvent: Event | null = null;
    try {
      existingEvent = await this.findById(id, tenantId);
    } catch (error) {
      // If event doesn't exist, update will fail anyway
      // Continue with validation using provided data only
    }

    // Validate using EventValidator
    const validationResult = eventValidator.validateUpdate(data, existingEvent);

    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join('; '));
    }

    return this.update(id, data, tenantId)
  }

  /**
   * Mark event as completed
   */
  async markCompleted(id: string, tenantId: string): Promise<Event> {
    return this.update(id, { 
      status: 'completed',
      end_date: new Date().toISOString()
    }, tenantId)
  }

  /**
   * Cancel event
   */
  async cancelEvent(id: string, tenantId: string, reason?: string): Promise<Event> {
    return this.update(id, { 
      status: 'cancelled',
      description: reason ? `${reason} (Event cancelled)` : 'Event cancelled'
    }, tenantId)
  }
}
