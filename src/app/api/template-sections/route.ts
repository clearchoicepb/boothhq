import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:template-sections')

// GET - List all sections (system + tenant custom)
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    log.debug('Fetching sections for tenant:', dataSourceTenantId)

    // Use RPC function to bypass RLS and get sections
    // This function returns both system sections and tenant-specific sections
    const { data, error } = await supabase.rpc('get_template_sections_for_tenant', {
      p_tenant_id: dataSourceTenantId,
      p_category: category
    })

    log.debug('Query result:', {
      count: data?.length || 0,
      error: error?.message,
      sample: data?.[0]
    })

    if (error) {
      log.error({ error }, '[Template Sections API] Database error')
      throw error
    }

    return NextResponse.json({ sections: data || [] })
  } catch (error: any) {
    log.error({ error }, '[Template Sections API] Error fetching template sections')
    return NextResponse.json(
      { error: 'Failed to fetch sections', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create custom section
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, content, description, merge_fields } = body

    if (!name || !category || !content) {
      return NextResponse.json(
        { error: 'name, category, and content are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['header', 'party-info', 'event-details', 'payment', 'operations', 'legal', 'signature']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('template_sections')
      .insert({
        tenant_id: dataSourceTenantId,
        name,
        category,
        content,
        description,
        merge_fields: merge_fields || [],
        is_system: false,
        is_required: false,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Database error')
      return NextResponse.json(
        { error: 'Failed to create section' },
        { status: 500 }
      )
    }

    return NextResponse.json({ section: data })
  } catch (error) {
    log.error({ error }, 'Error creating section')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
