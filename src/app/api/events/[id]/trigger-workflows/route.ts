import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { workflowEngine } from '@/lib/services/workflowEngine'

/**
 * POST /api/events/[id]/trigger-workflows
 * Manually trigger workflow execution for an event
 * 
 * Used when:
 * - Event type was added after event creation
 * - Workflows failed previously and user wants to retry
 * - User wants to regenerate tasks from workflows
 * 
 * Duplicate prevention is handled automatically by workflowEngine
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const eventId = params.id

    console.log(`[Trigger Workflows] Manual trigger requested for event ${eventId}`)

    // Fetch the event to get event_type_id
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_type_id, title')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      console.error('[Trigger Workflows] Event not found:', eventError)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.event_type_id) {
      console.warn(`[Trigger Workflows] Event ${eventId} has no event_type_id`)
      return NextResponse.json({ 
        error: 'Cannot trigger workflows: Event type is not set',
        hint: 'Please set an event type first'
      }, { status: 400 })
    }

    console.log(`[Trigger Workflows] Executing workflows for event type: ${event.event_type_id}`)

    // Execute workflows (duplicate prevention is handled inside workflowEngine)
    const workflowResults = await workflowEngine.executeWorkflowsForEvent({
      eventId: eventId,
      eventTypeId: event.event_type_id,
      tenantId: context.tenantId,
      dataSourceTenantId,
      supabase,
      userId: session.user.id,
    })

    const totalTasks = workflowResults.reduce((sum, result) => sum + result.createdTaskIds.length, 0)
    const totalDesignItems = workflowResults.reduce((sum, result) => sum + result.createdDesignItemIds.length, 0)

    // If no workflows executed (because of duplicate prevention), inform user
    if (workflowResults.length === 0) {
      console.log(`[Trigger Workflows] No workflows executed (already completed or none found)`)
      return NextResponse.json({
        success: true,
        message: 'Workflows have already been executed for this event',
        stats: {
          workflowsExecuted: 0,
          tasksCreated: 0,
          designItemsCreated: 0
        }
      })
    }

    console.log(`[Trigger Workflows] ✅ Success: ${workflowResults.length} workflows, ${totalTasks} tasks, ${totalDesignItems} design items`)

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${workflowResults.length} workflow(s)`,
      stats: {
        workflowsExecuted: workflowResults.length,
        tasksCreated: totalTasks,
        designItemsCreated: totalDesignItems
      }
    })
  } catch (error) {
    console.error('[Trigger Workflows] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to trigger workflows',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

