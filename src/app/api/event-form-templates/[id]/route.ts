import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-form-templates')

/**
 * GET /api/event-form-templates/[id]
 * Get a single event form template by ID
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const templateId = params.id

    const { data, error } = await supabase
      .from('event_form_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error in GET /api/event-form-templates/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/event-form-templates/[id]
 * Update an event form template
 */
export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const templateId = params.id
    const body = await request.json()

    const { name, description, category, status, fields } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Template name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (status !== undefined) updateData.status = status
    if (fields !== undefined) updateData.fields = fields

    const { data, error } = await supabase
      .from('event_form_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error updating event form template')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error in PUT /api/event-form-templates/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/event-form-templates/[id]
 * Delete an event form template
 */
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const templateId = params.id

    const { error } = await supabase
      .from('event_form_templates')
      .delete()
      .eq('id', templateId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting event form template')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error in DELETE /api/event-form-templates/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
