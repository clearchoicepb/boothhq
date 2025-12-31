import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:templates')
// GET - List templates
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('type') // email, sms, contract, or null for all

    let query = supabase
      .from('templates')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    const { data: templates, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching templates')
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json(templates)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { template_type, name, subject, content, merge_fields, is_active, sections, include_invoice_attachment } = body

    if (!template_type || !name || !content) {
      return NextResponse.json(
        { error: 'template_type, name, and content are required' },
        { status: 400 }
      )
    }

    // Validate template_type
    if (!['email', 'sms', 'contract', 'corporate', 'private', 'lease', 'custom'].includes(template_type)) {
      return NextResponse.json(
        { error: 'template_type must be email, sms, contract, corporate, private, lease, or custom' },
        { status: 400 }
      )
    }

    // Build insert data
    const insertData: Record<string, any> = {
      tenant_id: dataSourceTenantId,
      template_type,
      name,
      subject: subject || null,
      content,
      merge_fields: merge_fields || [],
      sections: sections || [],
      is_active: is_active !== undefined ? is_active : true,
      created_by: session.user.id,
    }

    // Only include include_invoice_attachment if provided (column may not exist yet)
    if (include_invoice_attachment !== undefined) {
      insertData.include_invoice_attachment = include_invoice_attachment
    }

    const { data: template, error } = await supabase
      .from('templates')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      log.error({ error, code: error.code, message: error.message }, 'Database error')
      return NextResponse.json(
        { error: 'Failed to create template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
