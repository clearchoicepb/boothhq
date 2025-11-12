import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const eventId = params.id
    // Fetch all activity types with user information
    const [communications, tasks, invoices, notes, attachments] = await Promise.all([
      // Communications
      supabase
        .from('communications')
        .select(`
          *,
          users:created_by (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', dataSourceTenantId)
        .order('communication_date', { ascending: false }),

      // Tasks
      supabase
        .from('tasks')
        .select(`
          *,
          users:assigned_to (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('entity_type', 'event')
        .eq('entity_id', eventId)
        .eq('tenant_id', dataSourceTenantId)
        .order('created_at', { ascending: false }),

      // Invoices
      supabase
        .from('invoices')
        .select(`
          *,
          users:created_by (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', dataSourceTenantId)
        .order('created_at', { ascending: false }),

      // Notes
      supabase
        .from('notes')
        .select(`
          *,
          users:created_by (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', dataSourceTenantId)
        .order('created_at', { ascending: false }),

      // Attachments
      supabase
        .from('attachments')
        .select(`
          *,
          users:uploaded_by (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .eq('tenant_id', dataSourceTenantId)
        .order('created_at', { ascending: false })
    ])

    // Transform and combine all activities into a single timeline
    const activities: any[] = []

    // Helper function to format user full name
    const formatUserName = (user: any) => {
      if (!user) return null
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`
      }
      return user.first_name || user.last_name || user.email || null
    }

    // Add communications
    if (communications.data) {
      communications.data.forEach(comm => {
        activities.push({
          id: comm.id,
          activity_type: 'communication',
          type: 'communication',
          subtype: comm.communication_type,
          title: comm.subject || `${comm.communication_type} - ${comm.direction}`,
          description: comm.notes,
          created_at: comm.communication_date,
          date: comm.communication_date,
          users: comm.users ? {
            ...comm.users,
            full_name: formatUserName(comm.users)
          } : null,
          metadata: comm
        })
      })
    }

    // Add tasks
    if (tasks.data) {
      tasks.data.forEach(task => {
        activities.push({
          id: task.id,
          activity_type: 'task',
          type: 'task',
          subtype: task.status,
          title: task.title,
          description: task.description,
          created_at: task.completed_at || task.created_at,
          date: task.completed_at || task.created_at,
          users: task.users ? {
            ...task.users,
            full_name: formatUserName(task.users)
          } : null,
          metadata: task
        })
      })
    }

    // Add invoices
    if (invoices.data) {
      invoices.data.forEach(invoice => {
        activities.push({
          id: invoice.id,
          activity_type: 'invoice',
          type: 'invoice',
          subtype: invoice.status,
          title: `Invoice ${invoice.invoice_number}`,
          description: `$${invoice.total_amount.toLocaleString()} - ${invoice.status}`,
          created_at: invoice.created_at,
          date: invoice.created_at,
          users: invoice.users ? {
            ...invoice.users,
            full_name: formatUserName(invoice.users)
          } : null,
          metadata: invoice
        })
      })
    }

    // Add notes
    if (notes.data) {
      notes.data.forEach(note => {
        activities.push({
          id: note.id,
          activity_type: 'note',
          type: 'note',
          subtype: 'note',
          title: 'Note added',
          description: note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : ''),
          created_at: note.created_at,
          date: note.created_at,
          users: note.users ? {
            ...note.users,
            full_name: formatUserName(note.users)
          } : null,
          metadata: note
        })
      })
    }

    // Add attachments
    if (attachments.data) {
      attachments.data.forEach(attachment => {
        activities.push({
          id: attachment.id,
          activity_type: 'attachment',
          type: 'attachment',
          subtype: 'file',
          title: `File attached: ${attachment.file_name}`,
          description: attachment.description || `${attachment.file_size} bytes`,
          created_at: attachment.created_at,
          date: attachment.created_at,
          users: attachment.users ? {
            ...attachment.users,
            full_name: formatUserName(attachment.users)
          } : null,
          metadata: attachment
        })
      })
    }

    // Sort all activities by date (most recent first)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
