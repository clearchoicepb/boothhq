/**
 * Opportunities Service
 * Centralized service for all opportunity-related API calls
 */

import { apiClient } from '../apiClient'
import type { Opportunity, OpportunityInsert, OpportunityUpdate } from '@/lib/supabase-client'

// Extended opportunity type with relations
export interface OpportunityWithRelations extends Opportunity {
  account_name?: string | null
  account_type?: 'individual' | 'company' | null
  contact_name?: string | null
  owner_name?: string | null
  lead_name?: string | null
  event_dates?: any[]
}

// List options
export interface OpportunitiesListOptions {
  stage?: string
  owner_id?: string
  page?: number
  limit?: number
  search?: string
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// Stats response
export interface OpportunityStats {
  total: number
  openCount: number
  totalValue: number
  expectedValue: number
  closedWonCount: number
  closedWonValue: number
  closedLostCount: number
  averageValue: number
  averageProbability: number
}

// Conversion payload
export interface ConvertToEventPayload {
  title?: string
  description?: string
  [key: string]: any
}

/**
 * Opportunities Service Class
 */
class OpportunitiesService {
  /**
   * List opportunities with filters and pagination
   */
  async list(options: OpportunitiesListOptions = {}): Promise<{
    data: OpportunityWithRelations[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const params = new URLSearchParams()

    if (options.stage && options.stage !== 'all') {
      params.append('stage', options.stage)
    }
    if (options.owner_id && options.owner_id !== 'all') {
      params.append('owner_id', options.owner_id)
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
    if (options.status) {
      params.append('status', options.status)
    }
    if (options.sort_by) {
      params.append('sort_by', options.sort_by)
    }
    if (options.sort_order) {
      params.append('sort_order', options.sort_order)
    }

    const queryString = params.toString()
    const url = `/api/entities/opportunities${queryString ? `?${queryString}` : ''}`

    return apiClient.get<{
      data: OpportunityWithRelations[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(url)
  }

  /**
   * Get a single opportunity by ID
   */
  async getById(id: string): Promise<OpportunityWithRelations> {
    return apiClient.get<OpportunityWithRelations>(`/api/opportunities/${id}`)
  }

  /**
   * Create a new opportunity
   */
  async create(data: Partial<OpportunityInsert>): Promise<Opportunity> {
    return apiClient.post<Opportunity>('/api/opportunities', data)
  }

  /**
   * Update an existing opportunity
   */
  async update(id: string, data: Partial<OpportunityUpdate>): Promise<Opportunity> {
    return apiClient.put<Opportunity>(`/api/opportunities/${id}`, data)
  }

  /**
   * Delete an opportunity
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/opportunities/${id}`)
  }

  /**
   * Get opportunity statistics
   */
  async getStats(filters?: { stage?: string; owner_id?: string }): Promise<OpportunityStats> {
    const params = new URLSearchParams()

    if (filters?.stage && filters.stage !== 'all') {
      params.append('stage', filters.stage)
    }
    if (filters?.owner_id && filters.owner_id !== 'all') {
      params.append('owner_id', filters.owner_id)
    }

    const queryString = params.toString()
    const url = `/api/opportunities/stats${queryString ? `?${queryString}` : ''}`

    return apiClient.get<OpportunityStats>(url)
  }

  /**
   * Convert opportunity to event
   */
  async convertToEvent(id: string, payload: ConvertToEventPayload = {}): Promise<any> {
    return apiClient.post(`/api/opportunities/${id}/convert-to-event`, payload)
  }

  /**
   * Clone an opportunity
   */
  async clone(id: string): Promise<Opportunity> {
    return apiClient.post<Opportunity>(`/api/opportunities/${id}/clone`)
  }

  /**
   * Get opportunity activity log
   */
  async getActivity(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/opportunities/${id}/activity`)
  }

  /**
   * Get tasks status for opportunities
   */
  async getTasksStatus(ids: string[]): Promise<Record<string, any>> {
    const idsParam = ids.join(',')
    return apiClient.get<Record<string, any>>(`/api/opportunities/tasks-status?ids=${idsParam}`)
  }

  /**
   * Get count by stage (for validation)
   */
  async getCountByStage(stage: string): Promise<{ count: number; stage: string }> {
    return apiClient.get<{ count: number; stage: string }>(`/api/opportunities/count-by-stage?stage=${stage}`)
  }
}

// Export singleton instance
export const opportunitiesService = new OpportunitiesService()
