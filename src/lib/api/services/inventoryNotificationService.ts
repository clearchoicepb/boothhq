/**
 * Inventory Notification Service
 * Centralized service for inventory-related notifications
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles notification API communication
 * - Dependency Inversion: Components depend on this abstraction
 * - Open/Closed: Extensible for new notification types
 *
 * Features:
 * - Maintenance due/overdue notifications
 * - Low stock/out of stock alerts
 * - Notification lifecycle management (pending, sent, dismissed)
 * - Email notification triggering
 */

import { apiClient } from '../apiClient'

/**
 * Inventory notification record
 */
export interface InventoryNotification {
  id: string
  tenant_id: string

  // Related entities (polymorphic)
  inventory_item_id: string | null
  consumable_id: string | null

  // Notification details
  notification_type: 'maintenance_due' | 'maintenance_overdue' | 'low_stock' | 'out_of_stock'
  status: 'pending' | 'sent' | 'dismissed'

  // Message content
  title: string
  message: string
  due_date: string | null // ISO date

  // Tracking
  sent_at: string | null
  dismissed_at: string | null
  dismissed_by: string | null

  // Audit
  created_at: string
  updated_at: string

  // Relations (populated by API)
  inventory_item?: {
    id: string
    item_name: string
    item_category: string
    serial_number: string | null
  }
  consumable?: {
    id: string
    category_name: string
    current_quantity: number
    unit_of_measure: string
  }
  dismissed_by_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

/**
 * Notification insert type
 */
export interface NotificationInsert {
  inventory_item_id?: string
  consumable_id?: string
  notification_type: 'maintenance_due' | 'maintenance_overdue' | 'low_stock' | 'out_of_stock'
  title: string
  message: string
  due_date?: string
}

/**
 * Notification update type
 */
export interface NotificationUpdate {
  status?: 'pending' | 'sent' | 'dismissed'
  title?: string
  message?: string
  due_date?: string
}

/**
 * Notification list options
 */
export interface NotificationListOptions {
  notification_type?: string
  status?: 'pending' | 'sent' | 'dismissed' | 'all'
  inventory_item_id?: string
  consumable_id?: string
  due_date_from?: string
  due_date_to?: string
  sort_by?: 'created_at' | 'due_date' | 'sent_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  total: number
  pending: number
  sent: number
  dismissed: number
  by_type: {
    type: string
    count: number
  }[]
}

/**
 * Batch dismiss response
 */
export interface BatchDismissResponse {
  success: boolean
  dismissed_count: number
}

/**
 * Send notification response
 */
export interface SendNotificationResponse {
  success: boolean
  sent_to: string[]
  notification_id: string
}

/**
 * Inventory Notification Service Class
 */
class InventoryNotificationService {
  /**
   * List notifications with filters
   *
   * @example
   * // Get all pending notifications
   * const notifications = await inventoryNotificationService.list({
   *   status: 'pending',
   *   sort_by: 'due_date',
   *   sort_order: 'asc'
   * })
   */
  async list(options: NotificationListOptions = {}): Promise<InventoryNotification[]> {
    const params = new URLSearchParams()

    if (options.notification_type) params.append('notification_type', options.notification_type)
    if (options.status && options.status !== 'all') params.append('status', options.status)
    if (options.inventory_item_id) params.append('inventory_item_id', options.inventory_item_id)
    if (options.consumable_id) params.append('consumable_id', options.consumable_id)
    if (options.due_date_from) params.append('due_date_from', options.due_date_from)
    if (options.due_date_to) params.append('due_date_to', options.due_date_to)
    if (options.sort_by) params.append('sort_by', options.sort_by)
    if (options.sort_order) params.append('sort_order', options.sort_order)
    if (options.page) params.append('page', String(options.page))
    if (options.limit) params.append('limit', String(options.limit))

    const queryString = params.toString()
    const url = `/api/inventory-notifications${queryString ? `?${queryString}` : ''}`

    return apiClient.get<InventoryNotification[]>(url)
  }

  /**
   * Get a single notification by ID
   *
   * @param id - Notification ID
   */
  async getById(id: string): Promise<InventoryNotification> {
    return apiClient.get<InventoryNotification>(`/api/inventory-notifications/${id}`)
  }

  /**
   * Create a new notification
   *
   * @param data - Notification data
   *
   * @example
   * const notification = await inventoryNotificationService.create({
   *   inventory_item_id: 'item-123',
   *   notification_type: 'maintenance_due',
   *   title: 'Maintenance Due: Camera C107',
   *   message: 'Scheduled maintenance is due on 2025-11-20',
   *   due_date: '2025-11-20'
   * })
   */
  async create(data: NotificationInsert): Promise<InventoryNotification> {
    return apiClient.post<InventoryNotification>('/api/inventory-notifications', data)
  }

  /**
   * Update a notification
   *
   * @param id - Notification ID
   * @param data - Partial update data
   */
  async update(id: string, data: NotificationUpdate): Promise<InventoryNotification> {
    return apiClient.patch<InventoryNotification>(`/api/inventory-notifications/${id}`, data)
  }

  /**
   * Delete a notification
   *
   * @param id - Notification ID
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`/api/inventory-notifications/${id}`)
  }

  /**
   * Dismiss a notification
   * Marks notification as dismissed
   *
   * @param id - Notification ID
   *
   * @example
   * await inventoryNotificationService.dismiss('notif-123')
   */
  async dismiss(id: string): Promise<InventoryNotification> {
    return apiClient.post<InventoryNotification>(`/api/inventory-notifications/${id}/dismiss`, {})
  }

  /**
   * Dismiss multiple notifications
   * Batch dismiss operation
   *
   * @param ids - Array of notification IDs
   */
  async dismissMany(ids: string[]): Promise<BatchDismissResponse> {
    return apiClient.post<BatchDismissResponse>('/api/inventory-notifications/dismiss-many', { ids })
  }

  /**
   * Mark notification as sent
   * Updates status and sent_at timestamp
   *
   * @param id - Notification ID
   */
  async markAsSent(id: string): Promise<InventoryNotification> {
    return this.update(id, { status: 'sent' })
  }

  /**
   * Send notification via email
   * Triggers email sending and updates notification status
   *
   * @param id - Notification ID
   * @param recipients - Optional array of email addresses (defaults to assigned users)
   */
  async send(id: string, recipients?: string[]): Promise<SendNotificationResponse> {
    return apiClient.post<SendNotificationResponse>(
      `/api/inventory-notifications/${id}/send`,
      { recipients }
    )
  }

  /**
   * Get pending notifications
   * Returns all notifications with status='pending'
   */
  async getPending(): Promise<InventoryNotification[]> {
    return this.list({ status: 'pending', sort_by: 'due_date', sort_order: 'asc' })
  }

  /**
   * Get maintenance notifications
   * Returns all maintenance-related notifications
   */
  async getMaintenanceNotifications(): Promise<InventoryNotification[]> {
    const due = await this.list({ notification_type: 'maintenance_due' })
    const overdue = await this.list({ notification_type: 'maintenance_overdue' })
    return [...due, ...overdue]
  }

  /**
   * Get stock alert notifications
   * Returns all low stock and out of stock notifications
   */
  async getStockAlerts(): Promise<InventoryNotification[]> {
    const lowStock = await this.list({ notification_type: 'low_stock' })
    const outOfStock = await this.list({ notification_type: 'out_of_stock' })
    return [...lowStock, ...outOfStock]
  }

  /**
   * Get notifications for an inventory item
   *
   * @param itemId - Inventory item ID
   */
  async getByItem(itemId: string): Promise<InventoryNotification[]> {
    return this.list({ inventory_item_id: itemId, sort_by: 'created_at', sort_order: 'desc' })
  }

  /**
   * Get notifications for a consumable
   *
   * @param consumableId - Consumable ID
   */
  async getByConsumable(consumableId: string): Promise<InventoryNotification[]> {
    return this.list({ consumable_id: consumableId, sort_by: 'created_at', sort_order: 'desc' })
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationStats> {
    return apiClient.get<NotificationStats>('/api/inventory-notifications/stats')
  }

  /**
   * Dismiss all pending notifications of a specific type
   *
   * @param notificationType - Type of notifications to dismiss
   */
  async dismissByType(
    notificationType: 'maintenance_due' | 'maintenance_overdue' | 'low_stock' | 'out_of_stock'
  ): Promise<BatchDismissResponse> {
    const notifications = await this.list({
      notification_type: notificationType,
      status: 'pending'
    })
    const ids = notifications.map(n => n.id)
    return this.dismissMany(ids)
  }

  /**
   * Create maintenance due notification
   * Convenience method for creating maintenance notifications
   *
   * @param itemId - Inventory item ID
   * @param itemName - Item name
   * @param dueDate - Due date
   */
  async createMaintenanceDue(
    itemId: string,
    itemName: string,
    dueDate: string
  ): Promise<InventoryNotification> {
    return this.create({
      inventory_item_id: itemId,
      notification_type: 'maintenance_due',
      title: `Maintenance Due: ${itemName}`,
      message: `Scheduled maintenance is due on ${dueDate}`,
      due_date: dueDate
    })
  }

  /**
   * Create low stock alert
   * Convenience method for creating low stock notifications
   *
   * @param consumableId - Consumable ID
   * @param categoryName - Category name
   * @param currentQuantity - Current quantity
   * @param unitOfMeasure - Unit of measure
   */
  async createLowStockAlert(
    consumableId: string,
    categoryName: string,
    currentQuantity: number,
    unitOfMeasure: string
  ): Promise<InventoryNotification> {
    return this.create({
      consumable_id: consumableId,
      notification_type: 'low_stock',
      title: `Low Stock: ${categoryName}`,
      message: `Only ${currentQuantity} ${unitOfMeasure} remaining. Consider reordering.`
    })
  }
}

// Export singleton instance
export const inventoryNotificationService = new InventoryNotificationService()

// Also export the class for testing/mocking
export { InventoryNotificationService }
