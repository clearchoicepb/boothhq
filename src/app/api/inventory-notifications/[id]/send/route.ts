import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

/**
 * POST - Send notification via email
 * Sends email and updates notification status to 'sent'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params
    const body = await request.json()

    // Get notification details
    const { data: notification, error: notificationError } = await supabase
      .from('inventory_notifications')
      .select(`
        *,
        inventory_item:inventory_items!inventory_notifications_inventory_item_id_fkey(
          id,
          item_name,
          item_category,
          serial_number,
          assigned_to_id,
          assigned_to_type
        ),
        consumable:consumable_inventory!inventory_notifications_consumable_id_fkey(
          id,
          current_quantity,
          unit_of_measure,
          category:equipment_categories!consumable_inventory_category_id_fkey(name)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (notificationError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Determine recipients
    let recipients: string[] = []

    if (body.recipients && Array.isArray(body.recipients)) {
      recipients = body.recipients
    } else {
      // Auto-determine recipients based on assigned users (for maintenance notifications)
      if (notification.inventory_item?.assigned_to_id && notification.inventory_item?.assigned_to_type === 'user') {
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('id', notification.inventory_item.assigned_to_id)
          .single()

        if (user?.email) {
          recipients.push(user.email)
        }
      }

      // If no recipients found, default to company email
      if (recipients.length === 0) {
        recipients.push(process.env.GMAIL_USER || 'info@clearchoicephotos.com')
      }
    }

    // Send email to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        await sendEmail({
          to: recipient,
          subject: notification.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #347dc4;">${notification.title}</h2>
              <p>${notification.message}</p>
              ${notification.due_date ? `<p><strong>Due Date:</strong> ${notification.due_date}</p>` : ''}
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 14px;">
                This is an automated notification from your inventory management system.
              </p>
            </div>
          `,
          text: `${notification.title}\n\n${notification.message}${notification.due_date ? `\n\nDue Date: ${notification.due_date}` : ''}`
        })
        return { success: true, recipient }
      } catch (error) {
        console.error(`Failed to send email to ${recipient}:`, error)
        return { success: false, recipient, error: String(error) }
      }
    })

    const results = await Promise.all(emailPromises)
    const successfulSends = results.filter(r => r.success)

    // Update notification status
    const { data: updatedNotification, error: updateError } = await supabase
      .from('inventory_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating notification status:', updateError)
    }

    return NextResponse.json({
      success: true,
      sent_to: successfulSends.map(r => r.recipient),
      failed: results.filter(r => !r.success),
      notification_id: id
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
