import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:event-form-templates')

/**
 * GET /api/event-form-templates
 * List all event form templates for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const category = searchParams.get('category')

    let query = supabase
      .from('event_form_templates')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching event form templates')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Error in GET /api/event-form-templates')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/event-form-templates
 * Create a new event form template
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, category, status, fields } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('event_form_templates')
      .insert({
        tenant_id: dataSourceTenantId,
        name: name.trim(),
        description: description || null,
        category: category || 'other',
        status: status || 'active',
        fields: fields || [],
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating event form template')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/event-form-templates')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
