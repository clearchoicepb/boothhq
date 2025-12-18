import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, updateWithTenantId, deleteWithTenantId } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { EventFormTemplateUpdate } from '@/types/event-forms'

const log = createLogger('api:event-form-templates')

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/event-form-templates/[id]
 * Get a single event form template by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { data, error } = await supabase
      .from('event_form_templates')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      log.error({ error }, 'Error fetching event form template')
      return NextResponse.json({ error: error.message }, { status: 500 })
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
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id } = params
    const body: EventFormTemplateUpdate = await request.json()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: 'Template name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.category !== undefined) {
      updateData.category = body.category
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.fields !== undefined) {
      updateData.fields = body.fields
    }

    const { data, error } = await updateWithTenantId(
      supabase,
      'event_form_templates',
      id,
      updateData,
      dataSourceTenantId,
      session.user.id
    )

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
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
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { error } = await deleteWithTenantId(
      supabase,
      'event_form_templates',
      id,
      dataSourceTenantId
    )

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
