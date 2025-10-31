import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo
    if (status !== undefined) {
      updateData.status = status
      // If marking as completed, set completed_at
      if (status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }
      // If changing from completed to something else, clear completed_at
      if (status !== 'completed') {
        updateData.completed_at = null
      }
    }
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.due_date = dueDate

    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json({
        error: 'Failed to update task',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      console.error('Error deleting task:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete task',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
