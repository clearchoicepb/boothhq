import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import crypto from 'crypto'

const log = createLogger('api:event-forms')

/**
 * Generate a URL-safe public ID (10-12 characters)
 */
function generatePublicId(): string {
  // Generate 8 random bytes and encode as base64url (no padding)
  return crypto.randomBytes(8).toString('base64url').slice(0, 11)
}

/**
 * GET /api/events/[eventId]/forms
 * List all forms for an event
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
    const { id: eventId } = params

    const { data, error } = await supabase
      .from('event_forms')
      .select(`
        *,
        template:event_form_templates(id, name, category)
      `)
      .eq('event_id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error({ error }, 'Error fetching event forms')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Error in GET /api/events/[eventId]/forms')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/events/[eventId]/forms
 * Create a new form for an event
 */
export async function POST(
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
    const { id: eventId } = params
    const body = await request.json()
    const { name, template_id, fields, field_mappings } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Form name is required' },
        { status: 400 }
      )
    }

    // If template_id is provided, fetch template fields
    let formFields = fields || []
    if (template_id && (!fields || fields.length === 0)) {
      const { data: template } = await supabase
        .from('event_form_templates')
        .select('fields')
        .eq('id', template_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (template?.fields) {
        formFields = template.fields
      }
    }

    // Generate unique public ID
    const public_id = generatePublicId()

    const { data, error } = await supabase
      .from('event_forms')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: eventId,
        template_id: template_id || null,
        name: name.trim(),
        fields: formFields,
        status: 'draft',
        public_id,
        field_mappings: field_mappings || null,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating event form')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/events/[eventId]/forms')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
