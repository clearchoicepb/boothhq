import { GenericRepository } from './GenericRepository'
import type { Event } from '@/lib/supabase-client'

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
    // Validate required fields
    if (!data.title || !data.event_type || !data.start_date) {
      throw new Error('Title, event type, and start date are required')
    }

    // Validate date logic
    if (data.end_date && new Date(data.end_date) < new Date(data.start_date)) {
      throw new Error('End date cannot be before start date')
    }

    // Validate start date is not in the past
    if (new Date(data.start_date) < new Date()) {
      throw new Error('Start date cannot be in the past')
    }

    return this.create({
      ...data,
      status: data.status || 'upcoming'
    }, tenantId)
  }

  /**
   * Update event with validation
   */
  async updateEvent(id: string, data: Partial<Event>, tenantId: string): Promise<Event> {
    // Validate date logic if dates are being updated
    if (data.start_date && data.end_date) {
      if (new Date(data.end_date) < new Date(data.start_date)) {
        throw new Error('End date cannot be before start date')
      }
    }

    // If updating start date, validate it's not in the past
    if (data.start_date && new Date(data.start_date) < new Date()) {
      throw new Error('Start date cannot be in the past')
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
