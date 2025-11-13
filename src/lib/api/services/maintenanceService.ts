/**
 * Maintenance Service
 * Centralized service for inventory maintenance tracking and history
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles maintenance API communication
 * - Dependency Inversion: Components depend on this abstraction
 * - Open/Closed: Extensible without modification
 *
 * Features:
 * - Complete maintenance logging
 * - Automatic task creation integration
 * - Next maintenance date calculation
 * - Maintenance history tracking
 */

import { apiClient } from '../apiClient'

/**
 * Maintenance history record
 */
export interface MaintenanceHistory {
  id: string
  tenant_id: string
  inventory_item_id: string

  // Maintenance details
  maintenance_date: string // ISO date
  performed_by: string | null
  maintenance_type: 'scheduled' | 'repair' | 'inspection' | 'cleaning' | 'calibration' | 'other'

  // Documentation
  notes: string
  cost: number | null

  // Next maintenance
  next_maintenance_date: string | null

  // Task link
  task_id: string | null

  // Audit
  created_at: string
  updated_at: string

  // Relations (populated by API)
  performed_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  inventory_item?: {
    id: string
    item_name: string
    item_category: string
  }
}

/**
 * Maintenance insert type
 */
export interface MaintenanceInsert {
  inventory_item_id: string
  maintenance_date: string // ISO date
  performed_by?: string | null
  maintenance_type?: 'scheduled' | 'repair' | 'inspection' | 'cleaning' | 'calibration' | 'other'
  notes: string
  cost?: number | null
  next_maintenance_date?: string | null
  task_id?: string | null
}

/**
 * Maintenance update type
 */
export interface MaintenanceUpdate extends Partial<Omit<MaintenanceInsert, 'inventory_item_id'>> {}

/**
 * Maintenance list options
 */
export interface MaintenanceListOptions {
  inventory_item_id?: string
  performed_by?: string
  maintenance_type?: string
  date_from?: string
  date_to?: string
  sort_by?: 'maintenance_date' | 'created_at' | 'cost'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/**
 * Items due for maintenance
 */
export interface ItemDueForMaintenance {
  id: string
  item_name: string
  item_category: string
  serial_number: string | null
  last_maintenance_date: string | null
  next_maintenance_date: string
  days_until_due: number
  is_overdue: boolean
  assigned_to_id: string | null
  assigned_to_type: string | null
}

/**
 * Complete maintenance response
 */
export interface CompleteMaintenanceResponse {
  success: boolean
  maintenance: MaintenanceHistory
  task_updated: boolean
  task_id: string | null
}

/**
 * Maintenance statistics
 */
export interface MaintenanceStats {
  total_maintenance_records: number
  total_cost: number
  items_due_soon: number
  items_overdue: number
  average_cost: number
  maintenance_by_type: {
    type: string
    count: number
    total_cost: number
  }[]
}

/**
 * Maintenance Service Class
 */
class MaintenanceService {
  /**
   * List maintenance history with filters
   *
   * @example
   * // Get maintenance history for an item
   * const history = await maintenanceService.list({
   *   inventory_item_id: 'item-123',
   *   sort_by: 'maintenance_date',
   *   sort_order: 'desc'
   * })
   */
  async list(options: MaintenanceListOptions = {}): Promise<MaintenanceHistory[]> {
    const params = new URLSearchParams()

    if (options.inventory_item_id) params.append('inventory_item_id', options.inventory_item_id)
    if (options.performed_by) params.append('performed_by', options.performed_by)
    if (options.maintenance_type) params.append('maintenance_type', options.maintenance_type)
    if (options.date_from) params.append('date_from', options.date_from)
    if (options.date_to) params.append('date_to', options.date_to)
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)
    if (options.page) params.append('page', String(options.page))
    if (options.limit) params.append('limit', String(options.limit))

    const queryString = params.toString()
    const url = `/api/maintenance${queryString ? `?${queryString}` : ''}`

    return apiClient.get<MaintenanceHistory[]>(url)
  }

  /**
   * Get maintenance history for a specific item
   *
   * @param itemId - Inventory item ID
   */
  async getByItem(itemId: string): Promise<MaintenanceHistory[]> {
    return this.list({ inventory_item_id: itemId, sort_by: 'maintenance_date', sort_order: 'desc' })
  }

  /**
   * Get a single maintenance record by ID
   *
   * @param id - Maintenance history ID
   */
  async getById(id: string): Promise<MaintenanceHistory> {
    return apiClient.get<MaintenanceHistory>(`/api/maintenance/${id}`)
  }

  /**
   * Log completed maintenance
   * Creates maintenance history record and updates inventory item
   *
   * @param data - Maintenance data
   *
   * @example
   * const maintenance = await maintenanceService.create({
   *   inventory_item_id: 'item-123',
   *   maintenance_date: '2025-11-13',
   *   maintenance_type: 'scheduled',
   *   notes: 'Cleaned lens, checked all functions, replaced battery',
   *   cost: 50.00,
   *   performed_by: 'user-456'
   * })
   */
  async create(data: MaintenanceInsert): Promise<MaintenanceHistory> {
    return apiClient.post<MaintenanceHistory>('/api/maintenance', data)
  }

  /**
   * Complete maintenance for an item
   * High-level method that handles:
   * - Creating maintenance record
   * - Calculating next maintenance date
   * - Updating linked task (if exists)
   * - Sending notifications
   *
   * @param itemId - Inventory item ID
   * @param data - Maintenance completion data
   *
   * @example
   * const result = await maintenanceService.completeMaintenance('item-123', {
   *   maintenance_type: 'scheduled',
   *   notes: 'All checks passed',
   *   cost: 0,
   *   performed_by: 'user-456'
   * })
   */
  async completeMaintenance(
    itemId: string,
    data: Omit<MaintenanceInsert, 'inventory_item_id'>
  ): Promise<CompleteMaintenanceResponse> {
    return apiClient.post<CompleteMaintenanceResponse>('/api/maintenance/complete', {
      inventory_item_id: itemId,
      ...data
    })
  }

  /**
   * Update maintenance record
   *
   * @param id - Maintenance history ID
   * @param data - Partial maintenance data to update
   */
  async update(id: string, data: MaintenanceUpdate): Promise<MaintenanceHistory> {
    return apiClient.patch<MaintenanceHistory>(`/api/maintenance/${id}`, data)
  }

  /**
   * Delete maintenance record
   *
   * @param id - Maintenance history ID
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/maintenance/${id}`)
  }

  /**
   * Get items due for maintenance
   * Returns items with next_maintenance_date within specified days
   *
   * @param daysAhead - Number of days to look ahead (default: 7)
   * @param includeOverdue - Include overdue items (default: true)
   *
   * @example
   * // Get items due in next 7 days
   * const itemsDue = await maintenanceService.getItemsDue(7)
   */
  async getItemsDue(
    daysAhead: number = 7,
    includeOverdue: boolean = true
  ): Promise<ItemDueForMaintenance[]> {
    const params = new URLSearchParams()
    params.append('days_ahead', String(daysAhead))
    params.append('include_overdue', String(includeOverdue))

    return apiClient.get<ItemDueForMaintenance[]>(`/api/maintenance/due?${params.toString()}`)
  }

  /**
   * Get overdue maintenance items
   */
  async getOverdueItems(): Promise<ItemDueForMaintenance[]> {
    return apiClient.get<ItemDueForMaintenance[]>('/api/maintenance/overdue')
  }

  /**
   * Get maintenance statistics
   *
   * @param dateFrom - Optional start date filter
   * @param dateTo - Optional end date filter
   */
  async getStats(dateFrom?: string, dateTo?: string): Promise<MaintenanceStats> {
    const params = new URLSearchParams()
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    const queryString = params.toString()
    return apiClient.get<MaintenanceStats>(
      `/api/maintenance/stats${queryString ? `?${queryString}` : ''}`
    )
  }

  /**
   * Calculate next maintenance date based on interval
   * Utility method for client-side calculations
   *
   * @param lastMaintenanceDate - Last maintenance date
   * @param intervalDays - Interval in days
   * @returns Next maintenance date (ISO string)
   */
  calculateNextMaintenanceDate(lastMaintenanceDate: string, intervalDays: number): string {
    const last = new Date(lastMaintenanceDate)
    const next = new Date(last)
    next.setDate(next.getDate() + intervalDays)
    return next.toISOString().split('T')[0]
  }

  /**
   * Check if maintenance is due
   *
   * @param nextMaintenanceDate - Next maintenance date
   * @param reminderDays - Days before due to trigger reminder (default: 7)
   * @returns True if maintenance is due or overdue
   */
  isDue(nextMaintenanceDate: string, reminderDays: number = 7): boolean {
    const next = new Date(nextMaintenanceDate)
    const today = new Date()
    const reminderDate = new Date(next)
    reminderDate.setDate(reminderDate.getDate() - reminderDays)

    return today >= reminderDate
  }

  /**
   * Check if maintenance is overdue
   *
   * @param nextMaintenanceDate - Next maintenance date
   * @returns True if maintenance is overdue
   */
  isOverdue(nextMaintenanceDate: string): boolean {
    const next = new Date(nextMaintenanceDate)
    const today = new Date()
    return today > next
  }
}

// Export singleton instance
export const maintenanceService = new MaintenanceService()

// Also export the class for testing/mocking
export { MaintenanceService }
