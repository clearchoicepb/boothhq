import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:cron')

/**
 * Vercel Cron Job - Send Pending Notifications
 * Runs daily at 9:00 AM UTC
 *
 * Schedule: 0 9 * * * (Every day at 9 AM)
 *
 * Actions:
 * - Finds all pending high/medium priority notifications
 * - Sends email notifications
 * - Updates notification status to 'sent'
 * - Processes all active tenants
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active tenants from application database
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('is_active', true)

    if (tenantsError) {
      log.error({ tenantsError }, 'Error fetching tenants')
      return NextResponse.json(
        { error: 'Failed to fetch tenants', details: tenantsError.message },
        { status: 500 }
      )
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tenants found',
        processed: 0
      })
    }

    let totalSent = 0
    let totalFailed = 0

    // Process each tenant
    for (const tenant of tenants) {
      try {
        // Get pending notifications for this tenant (high and medium priority only)
        const { data: notifications, error: notificationsError } = await supabase
          .from('inventory_notifications')
          .select(`
            id,
            title,
            message,
            priority,
            due_date,
            notification_type,
            inventory_item:inventory_items!inventory_notifications_inventory_item_id_fkey(
              id,
              item_name,
              assigned_to_id,
              assigned_to_type
            ),
            consumable:consumable_inventory!inventory_notifications_consumable_id_fkey(
              id,
              category:equipment_categories!consumable_inventory_category_id_fkey(name)
            )
          `)
          .eq('tenant_id', tenant.id)
          .eq('status', 'pending')
          .in('priority', ['high', 'medium'])
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(50) // Limit to avoid overwhelming email server

        if (notificationsError) {
          log.error({ notificationsError }, 'Error fetching notifications for tenant ${tenant.subdomain}')
          continue
        }

        if (!notifications || notifications.length === 0) continue

        // Send emails and update statuses
        for (const notification of notifications) {
          try {
            // Determine recipients
            let recipients: string[] = []

            // Cast inventory_item as single object (many-to-one relationship)
            const inventoryItem = notification.inventory_item as { id: string; item_name: string; assigned_to_id: string | null; assigned_to_type: string | null } | null

            // Try to get email from assigned user
            if (inventoryItem?.assigned_to_id &&
                inventoryItem?.assigned_to_type === 'user') {
              const { data: user } = await supabase
                .from('users')
                .select('email')
                .eq('id', inventoryItem.assigned_to_id)
                .single()

              if (user?.email) {
                recipients.push(user.email)
              }
            }

            // Default to company email if no specific recipient
            if (recipients.length === 0) {
              recipients.push(process.env.GMAIL_USER || 'info@clearchoicephotos.com')
            }

            // Send emails
            const emailPromises = recipients.map(async (recipient) => {
              try {
                await sendEmail({
                  to: recipient,
                  subject: `[${notification.priority?.toUpperCase()}] ${notification.title}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: ${notification.priority === 'high' ? '#FEE2E2' : '#FEF3C7'}; border-left: 4px solid ${notification.priority === 'high' ? '#DC2626' : '#F59E0B'}; padding: 16px; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: ${notification.priority === 'high' ? '#991B1B' : '#92400E'};">
                          ${notification.title}
                        </h2>
                      </div>
                      <p style="font-size: 16px; line-height: 1.6;">${notification.message}</p>
                      ${notification.due_date ? `
                        <div style="background: #F3F4F6; padding: 12px; border-radius: 6px; margin-top: 16px;">
                          <strong>Due Date:</strong> ${new Date(notification.due_date).toLocaleDateString()}
                        </div>
                      ` : ''}
                      <hr style="border: 1px solid #e5e7eb; margin: 24px 0;" />
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        This is an automated notification from your inventory management system.
                        <br/>Tenant: ${tenant.subdomain}
                      </p>
                    </div>
                  `,
                  text: `${notification.title}\n\n${notification.message}${notification.due_date ? `\n\nDue Date: ${new Date(notification.due_date).toLocaleDateString()}` : ''}`
                })
                return true
              } catch (error) {
                log.error({ error }, 'Failed to send email to ${recipient}')
                return false
              }
            })

            const results = await Promise.all(emailPromises)
            const allSent = results.every(r => r)

            if (allSent) {
              // Update notification status to sent
              await supabase
                .from('inventory_notifications')
                .update({
                  status: 'sent',
                  sent_at: new Date().toISOString()
                })
                .eq('id', notification.id)

              totalSent++
            } else {
              totalFailed++
            }
          } catch (error) {
            log.error({ error }, 'Error processing notification ${notification.id}')
            totalFailed++
          }
        }
      } catch (error) {
        log.error({ error }, 'Error processing tenant ${tenant.subdomain}')
      }
    }

    log.debug({ totalSent, totalFailed }, 'Notifications cron completed')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_tenants: tenants.length,
        notifications_sent: totalSent,
        notifications_failed: totalFailed
      }
    })
  } catch (error: any) {
    log.error({ error }, 'Cron error')
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
