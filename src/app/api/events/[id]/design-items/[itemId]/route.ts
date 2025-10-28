import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// PUT - Update design item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { itemId } = await params
    const body = await request.json()
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Check if the new status is a completion status
    let isCompletedStatus = false
    if (body.status) {
      const { data: statusData } = await supabase
        .from('design_statuses')
        .select('is_completed')
        .eq('tenant_id', session.user.tenantId)
        .eq('slug', body.status)
        .single()

      isCompletedStatus = statusData?.is_completed || false

      // If status is being updated to a completion status, set completed_at
      if (isCompletedStatus && !body.completed_at) {
        body.completed_at = new Date().toISOString()
      }
    }

    const { data: designItem, error } = await supabase
      .from('event_design_items')
      .update(body)
      .eq('id', itemId)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) throw error

    // Update linked task if status changed
    if (designItem.task_id && body.status) {
      const taskStatus = isCompletedStatus ? 'completed' : 'in_progress'
      await supabase
        .from('tasks')
        .update({ status: taskStatus })
        .eq('id', designItem.task_id)
    }

    return NextResponse.json({ designItem })
  } catch (error: any) {
    console.error('Error updating design item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete design item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { itemId } = await params
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Get the design item to find linked task
    const { data: designItem } = await supabase
      .from('event_design_items')
      .select('task_id')
      .eq('id', itemId)
      .single()

    // Delete the design item
    const { error } = await supabase
      .from('event_design_items')
      .delete()
      .eq('id', itemId)
      .eq('tenant_id', session.user.tenantId)

    if (error) throw error

    // Optionally delete linked task
    if (designItem?.task_id) {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', designItem.task_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting design item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
