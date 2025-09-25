import { GenericRepository } from './GenericRepository'
import type { Contact } from '@/lib/supabase-client'

export class ContactRepository extends GenericRepository<Contact> {
  constructor() {
    super('contacts')
  }

  /**
   * Find contacts by account ID
   */
  async findByAccountId(accountId: string, tenantId: string): Promise<Contact[]> {
    return this.findMany(tenantId, {
      where: { account_id: accountId }
    })
  }

  /**
   * Find contacts by email
   */
  async findByEmail(email: string, tenantId: string): Promise<Contact | null> {
    const results = await this.findMany(tenantId, {
      where: { email },
      limit: 1
    })
    return results[0] || null
  }

  /**
   * Find contacts by phone number
   */
  async findByPhone(phone: string, tenantId: string): Promise<Contact | null> {
    const results = await this.findMany(tenantId, {
      where: { phone },
      limit: 1
    })
    return results[0] || null
  }

  /**
   * Search contacts by name, email, or phone
   */
  async searchContacts(query: string, tenantId: string, limit: number = 50): Promise<Contact[]> {
    return this.search(tenantId, {
      query,
      fields: ['first_name', 'last_name', 'email', 'phone'],
      fuzzy: true
    }, { limit })
  }

  /**
   * Get contacts with their associated accounts
   */
  async findWithAccounts(tenantId: string, options?: { limit?: number; offset?: number }): Promise<Contact[]> {
    return this.findMany(tenantId, {
      include: ['accounts'],
      limit: options?.limit,
      offset: options?.offset
    })
  }

  /**
   * Get contact statistics
   */
  async getStats(tenantId: string): Promise<{
    total: number
    active: number
    inactive: number
    withAccounts: number
    withoutAccounts: number
  }> {
    const [total, active, inactive, withAccounts, withoutAccounts] = await Promise.all([
      this.count(tenantId),
      this.count(tenantId, { status: 'active' }),
      this.count(tenantId, { status: 'inactive' }),
      this.count(tenantId, { account_id: { is: 'not null' } }),
      this.count(tenantId, { account_id: { is: 'null' } })
    ])

    return {
      total,
      active,
      inactive,
      withAccounts,
      withoutAccounts
    }
  }

  /**
   * Create contact with validation
   */
  async createContact(data: {
    first_name: string
    last_name: string
    email?: string
    phone?: string
    account_id?: string
    job_title?: string
    status?: string
  }, tenantId: string): Promise<Contact> {
    // Validate required fields
    if (!data.first_name || !data.last_name) {
      throw new Error('First name and last name are required')
    }

    // Check for duplicate email if provided
    if (data.email) {
      const existing = await this.findByEmail(data.email, tenantId)
      if (existing) {
        throw new Error('Contact with this email already exists')
      }
    }

    // Check for duplicate phone if provided
    if (data.phone) {
      const existing = await this.findByPhone(data.phone, tenantId)
      if (existing) {
        throw new Error('Contact with this phone number already exists')
      }
    }

    return this.create({
      ...data,
      status: data.status || 'active'
    }, tenantId)
  }

  /**
   * Update contact with validation
   */
  async updateContact(id: string, data: Partial<Contact>, tenantId: string): Promise<Contact> {
    // Check for duplicate email if being updated
    if (data.email) {
      const existing = await this.findByEmail(data.email, tenantId)
      if (existing && existing.id !== id) {
        throw new Error('Contact with this email already exists')
      }
    }

    // Check for duplicate phone if being updated
    if (data.phone) {
      const existing = await this.findByPhone(data.phone, tenantId)
      if (existing && existing.id !== id) {
        throw new Error('Contact with this phone number already exists')
      }
    }

    return this.update(id, data, tenantId)
  }
}
