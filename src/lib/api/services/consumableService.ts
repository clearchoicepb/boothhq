/**
 * Consumable Service
 * Centralized service for consumable inventory management
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles consumable API communication
 * - Dependency Inversion: Components depend on this abstraction
 * - Open/Closed: Extensible without modification
 *
 * Features:
 * - Track consumable inventory levels
 * - Log usage (manual and automatic from events)
 * - Low stock alerts
 * - Reorder tracking
 * - Usage analytics
 */

import { apiClient } from '../apiClient'
import type { EquipmentCategory } from './equipmentCategoryService'

/**
 * Consumable inventory record
 */
export interface ConsumableInventory {
  id: string
  tenant_id: string
  category_id: string

  // Quantity tracking
  current_quantity: number
  unit_of_measure: string

  // Reorder tracking
  last_reorder_date: string | null
  last_reorder_quantity: number | null
  last_reorder_cost: number | null

  // Audit
  created_at: string
  updated_at: string

  // Relations (populated by API)
  category?: EquipmentCategory
}

/**
 * Consumable usage log entry
 */
export interface ConsumableUsageLog {
  id: string
  tenant_id: string
  consumable_id: string
  event_id: string | null

  // Usage details
  quantity_used: number
  usage_type: 'event' | 'manual' | 'adjustment' | 'waste'
  usage_date: string // ISO date
  notes: string | null

  // Audit
  logged_by: string | null
  created_at: string

  // Relations (populated by API)
  consumable?: ConsumableInventory
  event?: {
    id: string
    event_name: string
    event_date: string
  }
  logged_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Consumable inventory insert
 */
export interface ConsumableInventoryInsert {
  category_id: string
  current_quantity: number
  unit_of_measure: string
  last_reorder_date?: string
  last_reorder_quantity?: number
  last_reorder_cost?: number
}

/**
 * Consumable inventory update
 */
export interface ConsumableInventoryUpdate extends Partial<Omit<ConsumableInventoryInsert, 'category_id'>> {}

/**
 * Usage log insert
 */
export interface UsageLogInsert {
  consumable_id: string
  quantity_used: number
  usage_type?: 'event' | 'manual' | 'adjustment' | 'waste'
  usage_date: string // ISO date
  event_id?: string
  notes?: string
  logged_by?: string
}

/**
 * Reorder record data
 */
export interface ReorderData {
  quantity: number
  cost: number
  date: string // ISO date
}

/**
 * Consumable with stock status
 */
export interface ConsumableWithStatus extends ConsumableInventory {
  low_stock_threshold: number
  estimated_consumption_per_event: number
  is_low_stock: boolean
  is_out_of_stock: boolean
  estimated_events_remaining: number
}

/**
 * Usage statistics
 */
export interface UsageStats {
  total_usage: number
  usage_by_type: {
    type: string
    quantity: number
    count: number
  }[]
  usage_by_month: {
    month: string
    quantity: number
  }[]
  average_per_event: number
  total_events: number
}

/**
 * List options
 */
export interface ConsumableListOptions {
  category_id?: string
  low_stock_only?: boolean
  sort_by?: 'category_name' | 'current_quantity' | 'updated_at'
  sort_order?: 'asc' | 'desc'
}

export interface UsageLogListOptions {
  consumable_id?: string
  event_id?: string
  usage_type?: string
  date_from?: string
  date_to?: string
  sort_by?: 'usage_date' | 'quantity_used' | 'created_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/**
 * Consumable Service Class
 */
class ConsumableService {
  /**
   * List all consumable inventory
   *
   * @example
   * // Get all low stock items
   * const items = await consumableService.list({ low_stock_only: true })
   */
  async list(options: ConsumableListOptions = {}): Promise<ConsumableWithStatus[]> {
    const params = new URLSearchParams()

    if (options.category_id) params.append('category_id', options.category_id)
    if (options.low_stock_only) params.append('low_stock_only', String(options.low_stock_only))
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)

    const queryString = params.toString()
    const url = `/api/consumables${queryString ? `?${queryString}` : ''}`

    return apiClient.get<ConsumableWithStatus[]>(url)
  }

  /**
   * Get a single consumable by ID
   *
   * @param id - Consumable ID
   */
  async getById(id: string): Promise<ConsumableWithStatus> {
    return apiClient.get<ConsumableWithStatus>(`/api/consumables/${id}`)
  }

  /**
   * Get consumable by category ID
   *
   * @param categoryId - Equipment category ID
   */
  async getByCategory(categoryId: string): Promise<ConsumableWithStatus | null> {
    const items = await this.list({ category_id: categoryId })
    return items.length > 0 ? items[0] : null
  }

  /**
   * Create new consumable inventory record
   *
   * @param data - Consumable data
   *
   * @example
   * const consumable = await consumableService.create({
   *   category_id: 'cat-123',
   *   current_quantity: 5000,
   *   unit_of_measure: 'prints'
   * })
   */
  async create(data: ConsumableInventoryInsert): Promise<ConsumableInventory> {
    return apiClient.post<ConsumableInventory>('/api/consumables', data)
  }

  /**
   * Update consumable inventory
   *
   * @param id - Consumable ID
   * @param data - Partial update data
   */
  async update(id: string, data: ConsumableInventoryUpdate): Promise<ConsumableInventory> {
    return apiClient.patch<ConsumableInventory>(`/api/consumables/${id}`, data)
  }

  /**
   * Delete consumable inventory record
   *
   * @param id - Consumable ID
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/consumables/${id}`)
  }

  /**
   * Log usage (deducts from inventory)
   * Automatically updates current_quantity
   *
   * @param data - Usage log data
   *
   * @example
   * // Log event usage
   * await consumableService.logUsage({
   *   consumable_id: 'consumable-123',
   *   quantity_used: 500,
   *   usage_type: 'event',
   *   usage_date: '2025-11-13',
   *   event_id: 'event-456'
   * })
   */
  async logUsage(data: UsageLogInsert): Promise<ConsumableUsageLog> {
    return apiClient.post<ConsumableUsageLog>('/api/consumables/usage', data)
  }

  /**
   * Get usage log with filters
   *
   * @param options - Filter options
   */
  async getUsageLog(options: UsageLogListOptions = {}): Promise<ConsumableUsageLog[]> {
    const params = new URLSearchParams()

    if (options.consumable_id) params.append('consumable_id', options.consumable_id)
    if (options.event_id) params.append('event_id', options.event_id)
    if (options.usage_type) params.append('usage_type', options.usage_type)
    if (options.date_from) params.append('date_from', options.date_from)
    if (options.date_to) params.append('date_to', options.date_to)
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)
    if (options.page) params.append('page', String(options.page))
    if (options.limit) params.append('limit', String(options.limit))

    const queryString = params.toString()
    return apiClient.get<ConsumableUsageLog[]>(
      `/api/consumables/usage${queryString ? `?${queryString}` : ''}`
    )
  }

  /**
   * Get usage log for specific consumable
   *
   * @param consumableId - Consumable ID
   */
  async getUsageByConsumable(consumableId: string): Promise<ConsumableUsageLog[]> {
    return this.getUsageLog({
      consumable_id: consumableId,
      sort_by: 'usage_date',
      sort_order: 'desc'
    })
  }

  /**
   * Record reorder
   * Updates reorder tracking fields and adds to quantity
   *
   * @param id - Consumable ID
   * @param data - Reorder data
   *
   * @example
   * await consumableService.recordReorder('consumable-123', {
   *   quantity: 10000,
   *   cost: 250.00,
   *   date: '2025-11-13'
   * })
   */
  async recordReorder(id: string, data: ReorderData): Promise<ConsumableInventory> {
    return apiClient.post<ConsumableInventory>(`/api/consumables/${id}/reorder`, data)
  }

  /**
   * Get low stock items
   * Returns consumables below their threshold
   */
  async getLowStockItems(): Promise<ConsumableWithStatus[]> {
    return this.list({ low_stock_only: true })
  }

  /**
   * Get usage statistics
   *
   * @param consumableId - Optional consumable ID to filter by
   * @param dateFrom - Optional start date
   * @param dateTo - Optional end date
   */
  async getUsageStats(
    consumableId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<UsageStats> {
    const params = new URLSearchParams()
    if (consumableId) params.append('consumable_id', consumableId)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const queryString = params.toString()
    return apiClient.get<UsageStats>(
      `/api/consumables/stats${queryString ? `?${queryString}` : ''}`
    )
  }

  /**
   * Estimate consumption for an event
   * Client-side utility
   *
   * @param category - Equipment category with consumption estimate
   * @returns Estimated quantity needed
   */
  estimateConsumptionForEvent(category: EquipmentCategory): number {
    return category.estimated_consumption_per_event || 0
  }

  /**
   * Calculate events remaining
   * Client-side utility
   *
   * @param currentQuantity - Current quantity in stock
   * @param consumptionPerEvent - Estimated consumption per event
   * @returns Number of events remaining
   */
  calculateEventsRemaining(currentQuantity: number, consumptionPerEvent: number): number {
    if (consumptionPerEvent === 0) return Infinity
    return Math.floor(currentQuantity / consumptionPerEvent)
  }

  /**
   * Check if reorder is needed
   * Client-side utility
   *
   * @param currentQuantity - Current quantity
   * @param threshold - Low stock threshold
   * @returns True if reorder needed
   */
  needsReorder(currentQuantity: number, threshold: number): boolean {
    return currentQuantity <= threshold
  }
}

// Export singleton instance
export const consumableService = new ConsumableService()

// Also export the class for testing/mocking
export { ConsumableService }
