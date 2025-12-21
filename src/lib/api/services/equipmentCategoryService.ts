/**
 * Equipment Category Service
 * Centralized service for all equipment category API calls
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles category API communication
 * - Dependency Inversion: Components depend on this abstraction, not fetch()
 * - Open/Closed: Easy to extend with new methods without modifying consumers
 *
 * Benefits:
 * - Type safety with TypeScript
 * - Automatic retry logic via apiClient
 * - Centralized error handling
 * - Easy to test (mock this service)
 * - Easy to add caching, logging, etc. in one place
 */

import { apiClient } from '../apiClient'

/**
 * Equipment Category type
 */
export interface EquipmentCategory {
  id: string
  tenant_id: string
  name: string
  description: string | null
  color: string
  enabled: boolean

  // Maintenance configuration
  requires_maintenance: boolean
  maintenance_interval_days: number
  maintenance_reminder_days: number

  // Category type
  category_type: 'equipment' | 'consumable'

  // Consumable-specific settings
  is_consumable: boolean
  estimated_consumption_per_event: number | null
  unit_of_measure: string | null
  low_stock_threshold: number | null

  // Automation
  auto_track_usage: boolean

  // Ordering
  sort_order: number

  // Audit fields
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Category insert type
 */
export interface CategoryInsert {
  name: string
  description?: string | null
  color?: string
  enabled?: boolean
  requires_maintenance?: boolean
  maintenance_interval_days?: number
  maintenance_reminder_days?: number
  category_type?: 'equipment' | 'consumable'
  is_consumable?: boolean
  estimated_consumption_per_event?: number | null
  unit_of_measure?: string | null
  low_stock_threshold?: number | null
  auto_track_usage?: boolean
  sort_order?: number
}

/**
 * Category update type
 */
export interface CategoryUpdate extends Partial<CategoryInsert> {}

/**
 * Category list options
 */
export interface CategoryListOptions {
  enabled?: boolean
  category_type?: 'equipment' | 'consumable'
  is_consumable?: boolean
  sort_by?: 'name' | 'sort_order' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

/**
 * Equipment Category Service Class
 */
class EquipmentCategoryService {
  /**
   * List all categories with optional filters
   *
   * @example
   * // Get all enabled equipment categories
   * const categories = await equipmentCategoryService.list({
   *   enabled: true,
   *   category_type: 'equipment'
   * })
   */
  async list(options: CategoryListOptions = {}): Promise<EquipmentCategory[]> {
    const params = new URLSearchParams()

    if (options.enabled !== undefined) params.append('enabled', String(options.enabled))
    if (options.category_type) params.append('category_type', options.category_type)
    if (options.is_consumable !== undefined) params.append('is_consumable', String(options.is_consumable))
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)

    const queryString = params.toString()
    const url = `/api/equipment-categories${queryString ? `?${queryString}` : ''}`

    return apiClient.get<EquipmentCategory[]>(url)
  }

  /**
   * Get a single category by ID
   *
   * @param id - Category ID
   */
  async getById(id: string): Promise<EquipmentCategory> {
    return apiClient.get<EquipmentCategory>(`/api/equipment-categories/${id}`)
  }

  /**
   * Create a new category
   *
   * @param data - Category data
   * @returns Created category
   *
   * @example
   * const category = await equipmentCategoryService.create({
   *   name: 'Cameras',
   *   description: 'Photography equipment',
   *   color: '#3B82F6',
   *   requires_maintenance: true,
   *   maintenance_interval_days: 90
   * })
   */
  async create(data: CategoryInsert): Promise<EquipmentCategory> {
    return apiClient.post<EquipmentCategory>('/api/equipment-categories', data)
  }

  /**
   * Update an existing category
   *
   * @param id - Category ID
   * @param data - Partial category data to update
   */
  async update(id: string, data: CategoryUpdate): Promise<EquipmentCategory> {
    return apiClient.patch<EquipmentCategory>(`/api/equipment-categories/${id}`, data)
  }

  /**
   * Delete a category
   * Note: Cannot delete if items are assigned to this category
   *
   * @param id - Category ID
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/equipment-categories/${id}`)
  }

  /**
   * Get all equipment categories (non-consumable)
   */
  async getEquipmentCategories(): Promise<EquipmentCategory[]> {
    return this.list({
      category_type: 'equipment',
      enabled: true
    })
  }

  /**
   * Get all consumable categories
   */
  async getConsumableCategories(): Promise<EquipmentCategory[]> {
    return this.list({
      is_consumable: true,
      enabled: true
    })
  }

  /**
   * Get categories that require maintenance
   */
  async getMaintenanceCategories(): Promise<EquipmentCategory[]> {
    const categories = await this.list({ enabled: true })
    return categories.filter(cat => cat.requires_maintenance)
  }

  /**
   * Update category color
   * Convenience method for color picker integration
   *
   * @param id - Category ID
   * @param color - Hex color code
   */
  async updateColor(id: string, color: string): Promise<EquipmentCategory> {
    return this.update(id, { color })
  }

  /**
   * Toggle category enabled status
   *
   * @param id - Category ID
   * @param enabled - New enabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<EquipmentCategory> {
    return this.update(id, { enabled })
  }

  /**
   * Reorder categories
   * Updates sort_order for multiple categories
   *
   * @param updates - Array of {id, sort_order} objects
   */
  async reorder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    return apiClient.post('/api/equipment-categories/reorder', { updates })
  }
}

// Export singleton instance
export const equipmentCategoryService = new EquipmentCategoryService()

// Also export the class for testing/mocking
export { EquipmentCategoryService }
