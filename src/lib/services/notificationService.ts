/**
 * Notification Service
 *
 * Server-side service for creating and managing user notifications.
 * Used by API routes to notify users of important events.
 *
 * USAGE:
 * ```typescript
 * import { createNotification } from '@/lib/services/notificationService'
 *
 * await createNotification({
 *   supabase,
 *   tenantId: dataSourceTenantId,
 *   userId: targetUserId,
 *   type: 'form_completed',
 *   title: 'Design form completed',
 *   message: 'Client submitted the design questionnaire',
 *   entityType: 'event',
 *   entityId: eventId,
 *   linkUrl: `/events/${eventId}`,
 *   actorName: 'John Smith',
 * })
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('services:notification')

/**
 * Supported notification types
 */
export type NotificationType =
  | 'form_completed'
  | 'proof_approved'
  | 'proof_rejected'
  | 'subtask_completed'
  | 'ticket_resolved'

/**
 * Parameters for creating a notification
 */
export interface CreateNotificationParams {
  supabase: SupabaseClient
  tenantId: string
  userId: string
  type: NotificationType
  title: string
  message?: string
  entityType?: string
  entityId?: string
  linkUrl?: string
  actorName?: string
}

/**
 * Result of a notification operation
 */
export interface NotificationResult {
  success: boolean
  notificationId?: string
  error?: string
}

/**
 * Create a single notification for a user
 *
 * @param params - Notification parameters
 * @returns Result indicating success or failure
 */
export async function createNotification({
  supabase,
  tenantId,
  userId,
  type,
  title,
  message,
  entityType,
  entityId,
  linkUrl,
  actorName,
}: CreateNotificationParams): Promise<NotificationResult> {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        type,
        title,
        message: message || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
        link_url: linkUrl || null,
        actor_name: actorName || null,
      })
      .select('id')
      .single()

    if (error) {
      log.error({ error, userId, type }, 'Failed to create notification')
      return { success: false, error: error.message }
    }

    log.debug({ notificationId: data.id, userId, type }, 'Notification created')
    return { success: true, notificationId: data.id }
  } catch (err) {
    log.error({ error: err }, 'Notification service error')
    return { success: false, error: 'Failed to create notification' }
  }
}

/**
 * Parameters for batch notification creation
 */
export interface BatchNotificationParams {
  tenantId: string
  userId: string
  type: NotificationType
  title: string
  message?: string
  entityType?: string
  entityId?: string
  linkUrl?: string
  actorName?: string
}

/**
 * Create notifications for multiple users at once
 *
 * Useful when an event affects multiple people (e.g., notifying all team members)
 *
 * @param supabase - Supabase client
 * @param notifications - Array of notification parameters
 * @returns Result indicating success or failure
 */
export async function createNotifications(
  supabase: SupabaseClient,
  notifications: BatchNotificationParams[]
): Promise<NotificationResult> {
  if (notifications.length === 0) {
    return { success: true }
  }

  try {
    const insertData = notifications.map((n) => ({
      tenant_id: n.tenantId,
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message || null,
      entity_type: n.entityType || null,
      entity_id: n.entityId || null,
      link_url: n.linkUrl || null,
      actor_name: n.actorName || null,
    }))

    const { error } = await supabase.from('user_notifications').insert(insertData)

    if (error) {
      log.error({ error, count: notifications.length }, 'Failed to create batch notifications')
      return { success: false, error: error.message }
    }

    log.debug({ count: notifications.length }, 'Batch notifications created')
    return { success: true }
  } catch (err) {
    log.error({ error: err }, 'Batch notification service error')
    return { success: false, error: 'Failed to create notifications' }
  }
}

/**
 * Delete notifications for a specific entity
 *
 * Useful when an entity is deleted and its notifications should be cleaned up
 *
 * @param supabase - Supabase client
 * @param tenantId - Tenant ID
 * @param entityType - Entity type (event, task, ticket, etc.)
 * @param entityId - Entity ID
 * @returns Result indicating success or failure
 */
export async function deleteNotificationsForEntity(
  supabase: SupabaseClient,
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<NotificationResult> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)

    if (error) {
      log.error({ error, entityType, entityId }, 'Failed to delete entity notifications')
      return { success: false, error: error.message }
    }

    log.debug({ entityType, entityId }, 'Entity notifications deleted')
    return { success: true }
  } catch (err) {
    log.error({ error: err }, 'Delete notifications error')
    return { success: false, error: 'Failed to delete notifications' }
  }
}
