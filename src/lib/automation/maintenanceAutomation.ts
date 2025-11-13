import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Automation service for maintenance-related tasks
 * Handles automatic task creation, notifications, and scheduling
 */

interface MaintenanceTaskConfig {
  inventoryItemId: string
  dueDate: string
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
}

export class MaintenanceAutomation {
  /**
   * Check for items requiring maintenance and create tasks automatically
   * Called by cron job or manually
   */
  static async createMaintenanceTasks(tenantId: string): Promise<{
    created: number
    errors: string[]
  }> {
    const supabase = createClientComponentClient()
    const created: number[] = []
    const errors: string[] = []

    try {
      // Get items with upcoming maintenance (next 7 days) that don't have tasks
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, next_maintenance_date, assigned_to_id')
        .eq('tenant_id', tenantId)
        .not('next_maintenance_date', 'is', null)
        .lte('next_maintenance_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('next_maintenance_date', { ascending: true })

      if (error) throw error
      if (!items || items.length === 0) return { created: 0, errors: [] }

      // Check which items already have maintenance tasks
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id, metadata')
        .eq('tenant_id', tenantId)
        .eq('task_type', 'maintenance')
        .in('status', ['pending', 'in_progress'])

      const itemsWithTasks = new Set(
        existingTasks?.map(t => t.metadata?.inventoryItemId).filter(Boolean) || []
      )

      // Create tasks for items without existing tasks
      for (const item of items) {
        if (itemsWithTasks.has(item.id)) continue

        try {
          const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
              tenant_id: tenantId,
              title: `Maintenance: ${item.item_name}`,
              description: `Scheduled maintenance is due for ${item.item_name}`,
              task_type: 'maintenance',
              priority: 'medium',
              status: 'pending',
              due_date: item.next_maintenance_date,
              assigned_to: item.assigned_to_id,
              metadata: {
                inventoryItemId: item.id,
                autoCreated: true,
                createdAt: new Date().toISOString()
              }
            })
            .select()
            .single()

          if (taskError) throw taskError
          if (task) created.push(task.id)
        } catch (err: any) {
          errors.push(`Failed to create task for ${item.item_name}: ${err.message}`)
        }
      }

      return {
        created: created.length,
        errors
      }
    } catch (error: any) {
      console.error('Error in createMaintenanceTasks:', error)
      return {
        created: created.length,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Create maintenance notifications for overdue items
   */
  static async createOverdueNotifications(tenantId: string): Promise<{
    created: number
    errors: string[]
  }> {
    const supabase = createClientComponentClient()
    const created: number[] = []
    const errors: string[] = []

    try {
      // Get overdue items
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('id, item_name, next_maintenance_date, assigned_to_id')
        .eq('tenant_id', tenantId)
        .not('next_maintenance_date', 'is', null)
        .lt('next_maintenance_date', new Date().toISOString())

      if (error) throw error
      if (!items || items.length === 0) return { created: 0, errors: [] }

      // Check which items already have overdue notifications
      const { data: existingNotifications } = await supabase
        .from('inventory_notifications')
        .select('id, inventory_item_id')
        .eq('tenant_id', tenantId)
        .eq('notification_type', 'maintenance_overdue')
        .in('status', ['pending', 'sent'])

      const itemsWithNotifications = new Set(
        existingNotifications?.map(n => n.inventory_item_id).filter(Boolean) || []
      )

      // Create notifications for items without existing notifications
      for (const item of items) {
        if (itemsWithNotifications.has(item.id)) continue

        try {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(item.next_maintenance_date).getTime()) / (1000 * 60 * 60 * 24)
          )

          const { data: notification, error: notificationError } = await supabase
            .from('inventory_notifications')
            .insert({
              tenant_id: tenantId,
              inventory_item_id: item.id,
              notification_type: 'maintenance_overdue',
              title: `Overdue Maintenance: ${item.item_name}`,
              message: `Maintenance for ${item.item_name} is ${daysOverdue} day(s) overdue. Please complete maintenance as soon as possible.`,
              due_date: item.next_maintenance_date,
              status: 'pending',
              priority: 'high'
            })
            .select()
            .single()

          if (notificationError) throw notificationError
          if (notification) created.push(notification.id)
        } catch (err: any) {
          errors.push(`Failed to create notification for ${item.item_name}: ${err.message}`)
        }
      }

      return {
        created: created.length,
        errors
      }
    } catch (error: any) {
      console.error('Error in createOverdueNotifications:', error)
      return {
        created: created.length,
        errors: [...errors, error.message]
      }
    }
  }

  /**
   * Update inventory item maintenance dates after completion
   * This is typically called from the API after maintenance is logged
   */
  static async updateItemAfterMaintenance(
    tenantId: string,
    inventoryItemId: string,
    maintenanceDate: string,
    intervalDays: number
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClientComponentClient()

    try {
      const nextDate = new Date(maintenanceDate)
      nextDate.setDate(nextDate.getDate() + intervalDays)

      const { error } = await supabase
        .from('inventory_items')
        .update({
          last_maintenance_date: maintenanceDate,
          next_maintenance_date: nextDate.toISOString().split('T')[0],
          maintenance_interval_days: intervalDays
        })
        .eq('id', inventoryItemId)
        .eq('tenant_id', tenantId)

      if (error) throw error

      // Dismiss any pending maintenance notifications for this item
      await supabase
        .from('inventory_notifications')
        .update({ status: 'dismissed' })
        .eq('tenant_id', tenantId)
        .eq('inventory_item_id', inventoryItemId)
        .eq('notification_type', 'maintenance_overdue')
        .in('status', ['pending', 'sent'])

      return { success: true }
    } catch (error: any) {
      console.error('Error in updateItemAfterMaintenance:', error)
      return { success: false, error: error.message }
    }
  }
}
