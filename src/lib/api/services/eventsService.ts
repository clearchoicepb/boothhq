/**
 * Events Service
 * Centralized service for all event-related API calls
 */

import { apiClient } from '../apiClient'
import type { Event, EventInsert, EventUpdate } from '@/lib/supabase-client'

// Extended event type with relations (omits fields that are redefined)
export interface EventWithRelations extends Omit<Event, 'location'> {
  account_name?: string | null
  account_type?: 'individual' | 'company' | null
  contact_name?: string | null
  opportunity_name?: string | null
  event_dates?: any[]
  location?: any
}

// List options
export interface EventsListOptions {
  status?: string
  type?: string
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  date_range?: string
}

// Stats response
export interface EventStats {
  total: number
  confirmed: number
  completed: number
  cancelled: number
  draft: number
  totalRevenue: number
  averageRevenue: number
}

// Task status response
export interface TaskStatus {
  [eventId: string]: {
    total: number
    completed: number
    percentage: number
  }
}

/**
 * Events Service Class
 */
class EventsService {
  /**
   * List events with filters and pagination
   */
  async list(options: EventsListOptions = {}): Promise<EventWithRelations[]> {
    const params = new URLSearchParams()

    if (options.status && options.status !== 'all') {
      params.append('status', options.status)
    }
    if (options.type && options.type !== 'all') {
      params.append('type', options.type)
    }
    if (options.page) {
      params.append('page', options.page.toString())
    }
    if (options.limit) {
      params.append('limit', options.limit.toString())
    }
    if (options.search) {
      params.append('search', options.search)
    }
    if (options.sort_by) {
      params.append('sort_by', options.sort_by)
    }
    if (options.sort_order) {
      params.append('sort_order', options.sort_order)
    }
    if (options.date_range) {
      params.append('date_range', options.date_range)
    }

    const queryString = params.toString()
    const url = `/api/events${queryString ? `?${queryString}` : ''}`

    return apiClient.get<EventWithRelations[]>(url)
  }

  /**
   * Get a single event by ID
   */
  async getById(id: string): Promise<EventWithRelations> {
    return apiClient.get<EventWithRelations>(`/api/events/${id}`)
  }

  /**
   * Create a new event
   */
  async create(data: Partial<EventInsert>): Promise<Event> {
    return apiClient.post<Event>('/api/events', data)
  }

  /**
   * Update an existing event
   */
  async update(id: string, data: Partial<EventUpdate>): Promise<Event> {
    return apiClient.put<Event>(`/api/events/${id}`, data)
  }

  /**
   * Delete an event
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/events/${id}`)
  }

  /**
   * Get event statistics
   */
  async getStats(): Promise<EventStats> {
    return apiClient.get<EventStats>('/api/events/stats')
  }

  /**
   * Clone an event
   */
  async clone(id: string): Promise<Event> {
    return apiClient.post<Event>(`/api/events/${id}/clone`)
  }

  /**
   * Get event activity log
   */
  async getActivity(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/events/${id}/activity`)
  }

  /**
   * Get tasks status for events
   */
  async getTasksStatus(ids?: string[]): Promise<TaskStatus> {
    const params = new URLSearchParams()
    if (ids && ids.length > 0) {
      params.append('ids', ids.join(','))
    }

    const queryString = params.toString()
    const url = `/api/events/tasks-status${queryString ? `?${queryString}` : ''}`

    const response = await apiClient.get<{ taskStatus: TaskStatus }>(url)
    return response.taskStatus || {}
  }

  /**
   * Get event core tasks
   */
  async getCoreTasks(eventId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/events/${eventId}/core-tasks`)
  }

  /**
   * Initialize core tasks for an event
   */
  async initializeCoreTasks(eventId: string): Promise<void> {
    return apiClient.post(`/api/events/${eventId}/core-tasks/initialize`)
  }

  /**
   * Get event logistics
   */
  async getLogistics(eventId: string): Promise<any> {
    return apiClient.get(`/api/events/${eventId}/logistics`)
  }

  /**
   * Update event logistics
   */
  async updateLogistics(eventId: string, data: any): Promise<any> {
    return apiClient.post(`/api/events/${eventId}/logistics`, data)
  }

  /**
   * Generate invoice for event
   */
  async generateInvoice(eventId: string, data: any): Promise<any> {
    return apiClient.post(`/api/events/${eventId}/generate-invoice`, data)
  }

  /**
   * Update an event date
   */
  async updateEventDate(eventDateId: string, data: any): Promise<any> {
    return apiClient.put(`/api/event-dates/${eventDateId}`, data)
  }

  /**
   * Create event staff assignment
   */
  async createStaffAssignment(data: any): Promise<any> {
    return apiClient.post('/api/event-staff', data)
  }

  /**
   * Update event staff assignment
   */
  async updateStaffAssignment(staffId: string, data: any): Promise<any> {
    return apiClient.put(`/api/event-staff/${staffId}`, data)
  }

  /**
   * Delete event staff assignment
   */
  async deleteStaffAssignment(staffId: string): Promise<void> {
    return apiClient.delete(`/api/event-staff/${staffId}`)
  }
}

// Export singleton instance
export const eventsService = new EventsService()
