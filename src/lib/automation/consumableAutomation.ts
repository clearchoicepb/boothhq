import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createLogger } from '@/lib/logger'

const log = createLogger('automation')

/**
 * Automation service for consumable inventory management
 * Handles automatic low stock alerts and reorder notifications
 */

export class ConsumableAutomation {
  /**
   * Check for low stock items and create notifications
   * Called by cron job or manually
   */
  static async createLowStockAlerts(tenantId: string): Promise<{
    created: number
    errors: string[]
  }> {
    const supabase = createClientComponentClient()
    const created: number[] = []
    const errors: string[] = []

    try {
      // Get all consumables with their category thresholds
      const { data: consumables, error } = await supabase
        .from('consumable_inventory')
        .select(`
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(
            id,
            name,
            low_stock_threshold,
            estimated_consumption_per_event
          )
        `)
        .eq('tenant_id', tenantId)

      if (error) throw error
      if (!consumables || consumables.length === 0) return { created: 0, errors: [] }

      // Check which consumables already have low stock notifications
      const { data: existingNotifications } = await supabase
        .from('inventory_notifications')
        .select('id, consumable_id')
        .eq('tenant_id', tenantId)
        .eq('notification_type', 'low_stock')
        .in('status', ['pending', 'sent'])

      const consumablesWithNotifications = new Set(
        existingNotifications?.map(n => n.consumable_id).filter(Boolean) || []
      )

      // Create notifications for low stock items
      for (const consumable of consumables) {
        // Cast category as single object (many-to-one relationship)
        const category = consumable.category as unknown as { id: string; name: string; low_stock_threshold: number; estimated_consumption_per_event: number | null } | null
        const threshold = category?.low_stock_threshold || 0
        const isLowStock = consumable.current_quantity <= threshold

        if (!isLowStock || consumablesWithNotifications.has(consumable.id)) continue

        try {
          const eventsRemaining = category?.estimated_consumption_per_event
            ? Math.floor(consumable.current_quantity / category.estimated_consumption_per_event)
            : null

          let message = `Stock level for ${category?.name || 'consumable'} is low: ${consumable.current_quantity} ${consumable.unit_of_measure} remaining.`

          if (eventsRemaining !== null && eventsRemaining < 3) {
            message += ` Only enough for approximately ${eventsRemaining} event(s).`
          }

          message += ' Please reorder soon.'

          const { data: notification, error: notificationError } = await supabase
            .from('inventory_notifications')
            .insert({
              tenant_id: tenantId,
              consumable_id: consumable.id,
              notification_type: 'low_stock',
              title: `Low Stock: ${category?.name || 'Consumable'}`,
              message,
              status: 'pending',
              priority: consumable.current_quantity === 0 ? 'high' : 'medium'
            })
            .select()
            .single()

          if (notificationError) throw notificationError
          if (notification) created.push(notification.id)
        } catch (err: any) {
          errors.push(`Failed to create notification for ${category?.name}: ${err.message}`)
        }
      }

      return {
        created: created.length,
        errors
      }
    } catch (error: any) {
      log.error({ error }, 'Error in createLowStockAlerts')
      return {
        created: created.length,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Create out of stock notifications for critical items
   */
  static async createOutOfStockAlerts(tenantId: string): Promise<{
    created: number
    errors: string[]
  }> {
    const supabase = createClientComponentClient()
    const created: number[] = []
    const errors: string[] = []

    try {
      // Get all consumables that are out of stock
      const { data: consumables, error } = await supabase
        .from('consumable_inventory')
        .select(`
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('current_quantity', 0)

      if (error) throw error
      if (!consumables || consumables.length === 0) return { created: 0, errors: [] }

      // Check which consumables already have out of stock notifications
      const { data: existingNotifications } = await supabase
        .from('inventory_notifications')
        .select('id, consumable_id')
        .eq('tenant_id', tenantId)
        .eq('notification_type', 'out_of_stock')
        .in('status', ['pending', 'sent'])

      const consumablesWithNotifications = new Set(
        existingNotifications?.map(n => n.consumable_id).filter(Boolean) || []
      )

      // Create notifications for out of stock items
      for (const consumable of consumables) {
        if (consumablesWithNotifications.has(consumable.id)) continue

        // Cast category as single object (many-to-one relationship)
        const category = consumable.category as unknown as { id: string; name: string } | null

        try {
          const { data: notification, error: notificationError } = await supabase
            .from('inventory_notifications')
            .insert({
              tenant_id: tenantId,
              consumable_id: consumable.id,
              notification_type: 'out_of_stock',
              title: `OUT OF STOCK: ${category?.name || 'Consumable'}`,
              message: `${category?.name || 'This consumable'} is completely out of stock. Immediate reorder required!`,
              status: 'pending',
              priority: 'high'
            })
            .select()
            .single()

          if (notificationError) throw notificationError
          if (notification) created.push(notification.id)
        } catch (err: any) {
          errors.push(`Failed to create notification for ${category?.name}: ${err.message}`)
        }
      }

      return {
        created: created.length,
        errors
      }
    } catch (error: any) {
      log.error({ error }, 'Error in createOutOfStockAlerts')
      return {
        created: created.length,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Automatically track usage when items are assigned to events
   * This should be called when inventory is checked out for an event
   */
  static async trackEventUsage(
    tenantId: string,
    eventId: string,
    consumables: { categoryId: string; quantityUsed: number }[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const supabase = createClientComponentClient()
    const errors: string[] = []

    try {
      for (const { categoryId, quantityUsed } of consumables) {
        // Get consumable inventory record
        const { data: consumable, error: consumableError } = await supabase
          .from('consumable_inventory')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('category_id', categoryId)
          .single()

        if (consumableError || !consumable) {
          errors.push(`Consumable not found for category ${categoryId}`)
          continue
        }

        // Log usage
        const { error: usageError } = await supabase
          .from('consumable_usage')
          .insert({
            tenant_id: tenantId,
            consumable_id: consumable.id,
            quantity_used: quantityUsed,
            event_id: eventId,
            usage_date: new Date().toISOString().split('T')[0],
            notes: 'Auto-tracked from event checkout'
          })

        if (usageError) {
          errors.push(`Failed to log usage for category ${categoryId}: ${usageError.message}`)
        }
      }

      return {
        success: errors.length === 0,
        errors
      }
    } catch (error: any) {
      log.error({ error }, 'Error in trackEventUsage')
      return {
        success: false,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Dismiss stock alerts after restocking
   */
  static async dismissStockAlertsAfterRestock(
    tenantId: string,
    consumableId: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClientComponentClient()

    try {
      // Dismiss all low stock and out of stock notifications for this consumable
      const { error } = await supabase
        .from('inventory_notifications')
        .update({ status: 'dismissed' })
        .eq('tenant_id', tenantId)
        .eq('consumable_id', consumableId)
        .in('notification_type', ['low_stock', 'out_of_stock'])
        .in('status', ['pending', 'sent'])

      if (error) throw error

      return { success: true }
    } catch (error: any) {
      log.error({ error }, 'Error in dismissStockAlertsAfterRestock')
      return { success: false, error: error.message }
    }
  }
}
