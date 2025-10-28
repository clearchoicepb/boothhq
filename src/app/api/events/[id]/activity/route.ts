import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const eventId = params.id
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Fetch all activity types
    const [communications, tasks, invoices, notes, attachments] = await Promise.all([
      // Communications
      supabase
        .from('communications')
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', session.user.tenantId)
        .order('communication_date', { ascending: false }),

      // Tasks
      supabase
        .from('tasks')
        .select('*')
        .eq('entity_type', 'event')
        .eq('entity_id', eventId)
        .eq('tenant_id', session.user.tenantId)
        .order('created_at', { ascending: false }),

      // Invoices
      supabase
        .from('invoices')
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', session.user.tenantId)
        .order('created_at', { ascending: false }),

      // Notes
      supabase
        .from('notes')
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', session.user.tenantId)
        .order('created_at', { ascending: false }),

      // Attachments
      supabase
        .from('attachments')
        .select('*')
        .eq('event_id', eventId)
        .eq('tenant_id', session.user.tenantId)
        .order('created_at', { ascending: false })
    ])

    // Transform and combine all activities into a single timeline
    const activities: any[] = []

    // Add communications
    if (communications.data) {
      communications.data.forEach(comm => {
        activities.push({
          id: comm.id,
          type: 'communication',
          subtype: comm.communication_type,
          title: comm.subject || `${comm.communication_type} - ${comm.direction}`,
          description: comm.notes,
          date: comm.communication_date,
          metadata: comm
        })
      })
    }

    // Add tasks
    if (tasks.data) {
      tasks.data.forEach(task => {
        activities.push({
          id: task.id,
          type: 'task',
          subtype: task.status,
          title: task.title,
          description: task.description,
          date: task.completed_at || task.created_at,
          metadata: task
        })
      })
    }

    // Add invoices
    if (invoices.data) {
      invoices.data.forEach(invoice => {
        activities.push({
          id: invoice.id,
          type: 'invoice',
          subtype: invoice.status,
          title: `Invoice ${invoice.invoice_number}`,
          description: `$${invoice.total_amount.toLocaleString()} - ${invoice.status}`,
          date: invoice.created_at,
          metadata: invoice
        })
      })
    }

    // Add notes
    if (notes.data) {
      notes.data.forEach(note => {
        activities.push({
          id: note.id,
          type: 'note',
          subtype: 'note',
          title: 'Note added',
          description: note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : ''),
          date: note.created_at,
          metadata: note
        })
      })
    }

    // Add attachments
    if (attachments.data) {
      attachments.data.forEach(attachment => {
        activities.push({
          id: attachment.id,
          type: 'attachment',
          subtype: 'file',
          title: `File attached: ${attachment.file_name}`,
          description: attachment.description || `${attachment.file_size} bytes`,
          date: attachment.created_at,
          metadata: attachment
        })
      })
    }

    // Sort all activities by date (most recent first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
