import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-forms')

/**
 * GET /api/events/[eventId]/forms/[formId]
 * Get a single event form
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const { eventId, formId } = params

    const { data, error } = await supabase
      .from('event_forms')
      .select(`
        *,
        template:event_form_templates(id, name, category)
      `)
      .eq('id', formId)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/events/[eventId]/forms/[formId]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/events/[eventId]/forms/[formId]
 * Update an event form
 */
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const { eventId, formId } = params
    const body = await request.json()

    const { name, fields, status, field_mappings, responses, sent_at, viewed_at, completed_at } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Form name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (fields !== undefined) updateData.fields = fields
    if (status !== undefined) updateData.status = status
    if (field_mappings !== undefined) updateData.field_mappings = field_mappings
    if (responses !== undefined) updateData.responses = responses
    if (sent_at !== undefined) updateData.sent_at = sent_at
    if (viewed_at !== undefined) updateData.viewed_at = viewed_at
    if (completed_at !== undefined) updateData.completed_at = completed_at

    const { data, error } = await supabase
      .from('event_forms')
      .update(updateData)
      .eq('id', formId)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error updating event form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error in PUT /api/events/[eventId]/forms/[formId]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/events/[eventId]/forms/[formId]
 * Delete an event form
 */
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ eventId: string; formId: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const { eventId, formId } = params

    const { error } = await supabase
      .from('event_forms')
      .delete()
      .eq('id', formId)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting event form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error in DELETE /api/events/[eventId]/forms/[formId]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
