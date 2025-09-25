import { getAllEntityTypes } from './api-entities'

export class PolymorphicApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  // Generic methods for any entity
  async getAll<T = any>(
    entity: string, 
    options: {
      search?: string
      status?: string
      type?: string
      page?: number
      limit?: number
      sort_by?: string
      sort_order?: 'asc' | 'desc'
    } = {}
  ): Promise<T[]> {
    const params = new URLSearchParams()
    
    if (options.search) params.append('search', options.search)
    if (options.status) params.append('status', options.status)
    if (options.type) params.append('type', options.type)
    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)

    const url = `${this.baseUrl}/api/entities/${entity}${params.toString() ? `?${params.toString()}` : ''}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${entity}: ${response.statusText}`)
    }
    
    return response.json()
  }

  async getById<T = any>(entity: string, id: string): Promise<T> {
    const url = `${this.baseUrl}/api/entities/${entity}/${id}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${entity} with id ${id}: ${response.statusText}`)
    }
    
    return response.json()
  }

  async create<T = any>(entity: string, data: Partial<T>): Promise<T> {
    const url = `${this.baseUrl}/api/entities/${entity}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create ${entity}: ${error.details || response.statusText}`)
    }
    
    return response.json()
  }

  async update<T = any>(entity: string, id: string, data: Partial<T>): Promise<T> {
    const url = `${this.baseUrl}/api/entities/${entity}/${id}`
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to update ${entity}: ${error.details || response.statusText}`)
    }
    
    return response.json()
  }

  async delete(entity: string, id: string): Promise<void> {
    const url = `${this.baseUrl}/api/entities/${entity}/${id}`
    
    const response = await fetch(url, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to delete ${entity}: ${error.details || response.statusText}`)
    }
  }

  // Search method
  async search<T = any>(entity: string, query: string): Promise<T[]> {
    return this.getAll<T>(entity, { search: query })
  }

  // Batch operations
  async batchCreate<T = any>(entity: string, items: Partial<T>[]): Promise<T[]> {
    const promises = items.map(item => this.create<T>(entity, item))
    return Promise.all(promises)
  }

  async batchUpdate<T = any>(entity: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const promises = updates.map(({ id, data }) => this.update<T>(entity, id, data))
    return Promise.all(promises)
  }

  async batchDelete(entity: string, ids: string[]): Promise<void> {
    const promises = ids.map(id => this.delete(entity, id))
    await Promise.all(promises)
  }
}

// Create a default instance
export const apiClient = new PolymorphicApiClient()

// Type-safe entity-specific methods
export function createEntityApi<T = any>(entity: string) {
  return {
    getAll: (options?: Parameters<PolymorphicApiClient['getAll']>[1]) => 
      apiClient.getAll<T>(entity, options),
    
    getById: (id: string) => 
      apiClient.getById<T>(entity, id),
    
    create: (data: Partial<T>) => 
      apiClient.create<T>(entity, data),
    
    update: (id: string, data: Partial<T>) => 
      apiClient.update<T>(entity, id, data),
    
    delete: (id: string) => 
      apiClient.delete(entity, id),
    
    search: (query: string) => 
      apiClient.search<T>(entity, query),
    
    batchCreate: (items: Partial<T>[]) => 
      apiClient.batchCreate<T>(entity, items),
    
    batchUpdate: (updates: Array<{ id: string; data: Partial<T> }>) => 
      apiClient.batchUpdate<T>(entity, updates),
    
    batchDelete: (ids: string[]) => 
      apiClient.batchDelete(entity, ids)
  }
}

// Pre-configured entity APIs
export const contactsApi = createEntityApi('contacts')
export const accountsApi = createEntityApi('accounts')
export const eventsApi = createEntityApi('events')
export const opportunitiesApi = createEntityApi('opportunities')
export const invoicesApi = createEntityApi('invoices')
export const leadsApi = createEntityApi('leads')

// Export all available entity types
export const availableEntities = getAllEntityTypes()
