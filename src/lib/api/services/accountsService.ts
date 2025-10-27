/**
 * Accounts Service
 * Centralized service for all account-related API calls
 */

import { apiClient } from '../apiClient'
import type { Account, AccountInsert, AccountUpdate } from '@/lib/supabase-client'

// List options
export interface AccountsListOptions {
  type?: 'individual' | 'company' | 'all'
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Accounts Service Class
 */
class AccountsService {
  /**
   * List accounts with filters and pagination
   */
  async list(options: AccountsListOptions = {}): Promise<Account[]> {
    const params = new URLSearchParams()

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

    const queryString = params.toString()
    const url = `/api/accounts${queryString ? `?${queryString}` : ''}`

    return apiClient.get<Account[]>(url)
  }

  /**
   * Get a single account by ID
   */
  async getById(id: string): Promise<Account> {
    return apiClient.get<Account>(`/api/accounts/${id}`)
  }

  /**
   * Search accounts by query
   */
  async search(query: string, options: { limit?: number } = {}): Promise<Account[]> {
    const params = new URLSearchParams({ search: query })

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    return apiClient.get<Account[]>(`/api/accounts?${params.toString()}`)
  }

  /**
   * Create a new account
   */
  async create(data: Partial<AccountInsert>): Promise<Account> {
    return apiClient.post<Account>('/api/accounts', data)
  }

  /**
   * Update an existing account
   */
  async update(id: string, data: Partial<AccountUpdate>): Promise<Account> {
    return apiClient.put<Account>(`/api/accounts/${id}`, data)
  }

  /**
   * Delete an account
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/accounts/${id}`)
  }

  /**
   * Get account activity log
   */
  async getActivity(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/accounts/${id}/activity`)
  }

  /**
   * Get account contacts
   */
  async getContacts(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/contacts?account_id=${id}`)
  }

  /**
   * Get account opportunities
   */
  async getOpportunities(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/opportunities?account_id=${id}`)
  }

  /**
   * Get account events
   */
  async getEvents(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/events?account_id=${id}`)
  }
}

// Export singleton instance
export const accountsService = new AccountsService()
