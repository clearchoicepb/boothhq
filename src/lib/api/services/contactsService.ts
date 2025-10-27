/**
 * Contacts Service
 * Centralized service for all contact-related API calls
 */

import { apiClient } from '../apiClient'
import type { Contact, ContactInsert, ContactUpdate } from '@/lib/supabase-client'

// Extended contact type with relations
export interface ContactWithRelations extends Contact {
  account_name?: string | null
  account_type?: 'individual' | 'company' | null
}

// List options
export interface ContactsListOptions {
  account_id?: string
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Contacts Service Class
 */
class ContactsService {
  /**
   * List contacts with filters and pagination
   */
  async list(options: ContactsListOptions = {}): Promise<ContactWithRelations[]> {
    const params = new URLSearchParams()

    if (options.account_id) {
      params.append('account_id', options.account_id)
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
    const url = `/api/contacts${queryString ? `?${queryString}` : ''}`

    return apiClient.get<ContactWithRelations[]>(url)
  }

  /**
   * Get a single contact by ID
   */
  async getById(id: string): Promise<ContactWithRelations> {
    return apiClient.get<ContactWithRelations>(`/api/contacts/${id}`)
  }

  /**
   * Search contacts by query
   */
  async search(query: string, options: { limit?: number } = {}): Promise<ContactWithRelations[]> {
    const params = new URLSearchParams({ search: query })

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    return apiClient.get<ContactWithRelations[]>(`/api/contacts?${params.toString()}`)
  }

  /**
   * Create a new contact
   */
  async create(data: Partial<ContactInsert>): Promise<Contact> {
    return apiClient.post<Contact>('/api/contacts', data)
  }

  /**
   * Update an existing contact
   */
  async update(id: string, data: Partial<ContactUpdate>): Promise<Contact> {
    return apiClient.put<Contact>(`/api/contacts/${id}`, data)
  }

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/contacts/${id}`)
  }

  /**
   * Get contact activity log
   */
  async getActivity(id: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/contacts/${id}/activity`)
  }

  /**
   * Get contacts by email
   */
  async getByEmail(email: string): Promise<ContactWithRelations | null> {
    const contacts = await this.search(email, { limit: 1 })
    return contacts.length > 0 ? contacts[0] : null
  }
}

// Export singleton instance
export const contactsService = new ContactsService()
