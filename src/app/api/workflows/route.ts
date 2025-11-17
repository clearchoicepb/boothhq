/**
 * Workflows API Route
 *
 * Handles CRUD operations for workflow automation templates
 *
 * ENDPOINTS:
 * - GET /api/workflows - List workflows with filters
 * - POST /api/workflows - Create new workflow
 *
 * ARCHITECTURE:
 * - Uses getTenantContext() for multi-tenant isolation
 * - All queries use dataSourceTenantId (not tenantId)
 * - Includes relations (actions, event types, users) for UI display
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════════
// GET - List workflows with filters
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse filters
    const eventTypeId = searchParams.get('eventTypeId')
    const isActiveParam = searchParams.get('isActive')
    const search = searchParams.get('search')
    const createdBy = searchParams.get('createdBy')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query with relations
    let query = supabase
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
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (eventTypeId) {
      query = query.eq('event_type_id', eventTypeId)
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true'
      query = query.eq('is_active', isActive)
    }

    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }

    // Search filter (searches in name and description)
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    // Also sort actions by execution_order
    query = query.order('execution_order', {
      referencedTable: 'workflow_actions',
      ascending: true,
    })

    // Execute query
    const { data, error, count } = await query.range(
      (page - 1) * limit,
      page * limit - 1
    )

    if (error) {
      console.error('[workflows/route.ts] Error fetching workflows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workflows', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[workflows/route.ts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Create new workflow
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflow, actions } = body

    // Start transaction (insert workflow, then actions)
    // Note: Supabase doesn't support true transactions, so we'll do our best

    // 1. Insert workflow
    const { data: createdWorkflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        ...workflow,
        tenant_id: dataSourceTenantId,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (workflowError || !createdWorkflow) {
      console.error('[workflows/route.ts] Error creating workflow:', workflowError)
      return NextResponse.json(
        { error: 'Failed to create workflow', details: workflowError?.message },
        { status: 500 }
      )
    }

    // 2. Insert actions (if any)
    if (actions && actions.length > 0) {
      const actionsToInsert = actions.map((action: any, index: number) => ({
        ...action,
        workflow_id: createdWorkflow.id,
        execution_order: action.execution_order ?? index,
      }))

      const { error: actionsError } = await supabase
        .from('workflow_actions')
        .insert(actionsToInsert)

      if (actionsError) {
        // Rollback: delete the workflow we just created
        await supabase
          .from('workflows')
          .delete()
          .eq('id', createdWorkflow.id)

        console.error('[workflows/route.ts] Error creating actions:', actionsError)
        return NextResponse.json(
          { error: 'Failed to create workflow actions', details: actionsError.message },
          { status: 500 }
        )
      }
    }

    // 3. Fetch the complete workflow with relations
    const { data: completeWorkflow, error: fetchError } = await supabase
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
      .eq('id', createdWorkflow.id)
      .single()

    if (fetchError || !completeWorkflow) {
      console.error('[workflows/route.ts] Error fetching created workflow:', fetchError)
      // Workflow was created, but we can't fetch it with relations
      // Return basic workflow data
      return NextResponse.json({
        success: true,
        workflow: createdWorkflow,
      })
    }

    return NextResponse.json({
      success: true,
      workflow: completeWorkflow,
    })
  } catch (error) {
    console.error('[workflows/route.ts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

