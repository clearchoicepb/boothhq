/**
 * Individual Workflow API Route
 *
 * Handles operations on a single workflow
 *
 * ENDPOINTS:
 * - GET /api/workflows/[id] - Get workflow by ID
 * - PATCH /api/workflows/[id] - Update workflow
 * - DELETE /api/workflows/[id] - Delete workflow
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════════
// GET - Get workflow by ID
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'

    // Fetch workflow with relations
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        actions:workflow_actions(
          *,
          task_template:task_templates(
            id,
            name,
            default_title,
            department,
            task_type,
            default_priority
          ),
          assigned_to_user:users(
            id,
            first_name,
            last_name,
            email,
            department,
            department_role
          )
        ),
        event_type:event_types(
          id,
          name,
          slug,
          event_category_id
        ),
        created_by_user:users!workflows_created_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Sort actions by execution_order
    if (workflow.actions && workflow.actions.length > 0) {
      workflow.actions.sort((a: any, b: any) => a.execution_order - b.execution_order)
    }

    // Optionally fetch statistics
    if (includeStats) {
      const { data: executions } = await supabase
        .from('workflow_executions')
        .select('status, started_at, completed_at, created_task_ids')
        .eq('workflow_id', id)
        .eq('tenant_id', dataSourceTenantId)

      const stats = {
        totalExecutions: executions?.length || 0,
        successfulExecutions: executions?.filter((e: any) => e.status === 'completed').length || 0,
        failedExecutions: executions?.filter((e: any) => e.status === 'failed').length || 0,
        lastExecutedAt: executions && executions.length > 0
          ? executions.sort((a: any, b: any) => 
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            )[0].started_at
          : null,
        totalTasksCreated: executions?.reduce((sum: number, e: any) => 
          sum + (e.created_task_ids?.length || 0), 0) || 0,
      }

      return NextResponse.json({ ...workflow, stats })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error('[workflows/[id]/route.ts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH - Update workflow
// ═══════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Update workflow
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('workflows')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (updateError || !updatedWorkflow) {
      console.error('[workflows/[id]/route.ts] Error updating workflow:', updateError)
      return NextResponse.json(
        { error: 'Failed to update workflow', details: updateError?.message },
        { status: 500 }
      )
    }

    // Fetch complete workflow with relations
    const { data: completeWorkflow } = await supabase
      .from('workflows')
      .select(`
        *,
        actions:workflow_actions(
          *,
          task_template:task_templates(
            id,
            name,
            default_title,
            department,
            task_type,
            default_priority
          ),
          assigned_to_user:users(
            id,
            first_name,
            last_name,
            email,
            department,
            department_role
          )
        ),
        event_type:event_types(
          id,
          name,
          slug,
          event_category_id
        ),
        created_by_user:users!workflows_created_by_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    return NextResponse.json(completeWorkflow || updatedWorkflow)
  } catch (error) {
    console.error('[workflows/[id]/route.ts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELETE - Delete workflow
// ═══════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Delete workflow (CASCADE will delete actions and executions)
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      console.error('[workflows/[id]/route.ts] Error deleting workflow:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete workflow', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Workflow deleted successfully' })
  } catch (error) {
    console.error('[workflows/[id]/route.ts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

