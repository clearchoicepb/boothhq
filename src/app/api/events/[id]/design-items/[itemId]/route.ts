import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
// PUT - Update design item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { itemId } = await params
    const body = await request.json()
    // Check if the new status is a completion status
    let isCompletedStatus = false
    if (body.status) {
      const { data: statusData } = await supabase
        .from('design_statuses')
        .select('is_completed')
        .eq('tenant_id', dataSourceTenantId)
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
      .eq('tenant_id', dataSourceTenantId)
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
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  try {
    const { itemId } = await params
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
      .eq('tenant_id', dataSourceTenantId)

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
