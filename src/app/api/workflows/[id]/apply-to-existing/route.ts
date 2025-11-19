/**
 * API Route: Apply Workflow to Existing Events
 * 
 * POST /api/workflows/{id}/apply-to-existing
 * - Applies a workflow to all existing future events that match its event type
 * - Skips events that already have executions for this workflow
 * - Only processes events with event_date in the future
 * 
 * GET /api/workflows/{id}/apply-to-existing
 * - Returns a preview of how many events would be affected
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { workflowEngine } from '@/lib/services/workflowEngine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET: Preview how many events would be affected
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workflowId } = params
    const context = await getTenantContext()

    if (context instanceof NextResponse) {
      return context
    }

    const { supabase, tenantId, dataSourceTenantId } = context

    // Fetch workflow details
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*, event_type:event_types(*)')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Get event type IDs this workflow applies to
    const eventTypeIds = Array.isArray(workflow.event_type_ids) 
      ? workflow.event_type_ids 
      : []

    if (eventTypeIds.length === 0) {
      return NextResponse.json({
        count: 0,
        message: 'Workflow has no event types configured'
      })
    }

    // Find all future events matching the event types
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, event_type_id, event_date, client_name')
      .in('event_type_id', eventTypeIds)
      .gte('event_date', new Date().toISOString().split('T')[0]) // Future events only
      .order('event_date', { ascending: true })

    if (eventsError) {
      console.error('[ApplyWorkflow] Error fetching events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      )
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        count: 0,
        message: 'No future events found matching this workflow',
        events: []
      })
    }

    // Check which events already have executions for this workflow
    const { data: existingExecutions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('trigger_entity_id')
      .eq('workflow_id', workflowId)
      .eq('status', 'completed')
      .in('trigger_entity_id', events.map(e => e.id))

    if (executionsError) {
      console.error('[ApplyWorkflow] Error checking executions:', executionsError)
    }

    const executedEventIds = new Set(
      existingExecutions?.map(e => e.trigger_entity_id) || []
    )

    // Filter to only events that haven't been executed yet
    const eligibleEvents = events.filter(e => !executedEventIds.has(e.id))

    return NextResponse.json({
      count: eligibleEvents.length,
      totalEvents: events.length,
      alreadyExecuted: executedEventIds.size,
      eventTypeName: workflow.event_type?.name || 'Unknown',
      events: eligibleEvents.map(e => ({
        id: e.id,
        client_name: e.client_name,
        event_date: e.event_date
      }))
    })

  } catch (error: any) {
    console.error('[ApplyWorkflow] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Apply workflow to all eligible events
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: workflowId } = params
    const context = await getTenantContext()

    if (context instanceof NextResponse) {
      return context
    }

    const { supabase, tenantId, dataSourceTenantId } = context

    // Fetch workflow details
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    if (!workflow.is_active) {
      return NextResponse.json(
        { error: 'Cannot apply inactive workflow' },
        { status: 400 }
      )
    }

    // Get event type IDs this workflow applies to
    const eventTypeIds = Array.isArray(workflow.event_type_ids) 
      ? workflow.event_type_ids 
      : []

    if (eventTypeIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Workflow has no event types configured',
        processed: 0,
        failed: 0
      })
    }

    // Find all future events matching the event types
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, event_type_id, event_date, client_name')
      .in('event_type_id', eventTypeIds)
      .gte('event_date', new Date().toISOString().split('T')[0]) // Future events only
      .order('event_date', { ascending: true })

    if (eventsError || !events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No future events to process',
        processed: 0,
        failed: 0
      })
    }

    // Check which events already have executions for this workflow
    const { data: existingExecutions } = await supabase
      .from('workflow_executions')
      .select('trigger_entity_id')
      .eq('workflow_id', workflowId)
      .eq('status', 'completed')
      .in('trigger_entity_id', events.map(e => e.id))

    const executedEventIds = new Set(
      existingExecutions?.map(e => e.trigger_entity_id) || []
    )

    // Filter to only events that haven't been executed yet
    const eligibleEvents = events.filter(e => !executedEventIds.has(e.id))

    console.log(`[ApplyWorkflow] Processing ${eligibleEvents.length} events for workflow ${workflowId}`)

    // Execute workflow for each eligible event
    let processed = 0
    let failed = 0
    const results = []

    for (const event of eligibleEvents) {
      try {
        const result = await workflowEngine.executeWorkflowsForEvent({
          eventId: event.id,
          eventTypeId: event.event_type_id,
          tenantId,
          dataSourceTenantId,
          supabase
        })

        if (result.success) {
          processed++
          results.push({
            eventId: event.id,
            clientName: event.client_name,
            eventDate: event.event_date,
            success: true,
            tasksCreated: result.results
              .flatMap(r => r.result?.createdTaskIds || [])
              .length,
            designItemsCreated: result.results
              .flatMap(r => r.result?.createdDesignItemIds || [])
              .length
          })
        } else {
          failed++
          results.push({
            eventId: event.id,
            clientName: event.client_name,
            eventDate: event.event_date,
            success: false,
            error: result.error
          })
        }
      } catch (error: any) {
        console.error(`[ApplyWorkflow] Error processing event ${event.id}:`, error)
        failed++
        results.push({
          eventId: event.id,
          clientName: event.client_name,
          eventDate: event.event_date,
          success: false,
          error: error.message
        })
      }
    }

    console.log(`[ApplyWorkflow] Complete. Processed: ${processed}, Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      processed,
      failed,
      skipped: executedEventIds.size,
      totalEvents: events.length,
      results
    })

  } catch (error: any) {
    console.error('[ApplyWorkflow] POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

