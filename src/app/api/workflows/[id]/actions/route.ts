/**
 * Workflow Actions API Route
 *
 * Handles updating actions for a workflow
 * PATCH /api/workflows/[id]/actions - Replace all actions
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

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

    const { id: workflowId } = await params
    const { actions } = await request.json()

    // Verify workflow exists
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Delete existing actions
    const { error: deleteError } = await supabase
      .from('workflow_actions')
      .delete()
      .eq('workflow_id', workflowId)

    if (deleteError) {
      console.error('[workflows/[id]/actions] Error deleting actions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete existing actions', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new actions (if any)
    if (actions && actions.length > 0) {
      const actionsToInsert = actions.map((action: any, index: number) => ({
        ...action,
        workflow_id: workflowId,
        execution_order: action.execution_order ?? index,
      }))

      const { error: insertError } = await supabase
        .from('workflow_actions')
        .insert(actionsToInsert)

      if (insertError) {
        console.error('[workflows/[id]/actions] Error inserting actions:', insertError)
        return NextResponse.json(
          { error: 'Failed to create actions', details: insertError.message },
          { status: 500 }
        )
      }
    }

    // Fetch complete workflow with new actions
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
        )
      `)
      .eq('id', workflowId)
      .single()

    return NextResponse.json(completeWorkflow)
  } catch (error) {
    console.error('[workflows/[id]/actions] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

