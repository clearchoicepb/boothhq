import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

// GET - List all sections (system + tenant custom)
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    console.log('[Template Sections API] Fetching sections for tenant:', dataSourceTenantId)

    // Fetch system sections (tenant_id = NULL or is_system = true) and tenant-specific sections
    // Using OR filter to get both in one query
    let query = supabase
      .from('template_sections')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${dataSourceTenantId},is_system.eq.true`)
      .order('sort_order', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    console.log('[Template Sections API] Query result:', {
      count: data?.length || 0,
      error: error?.message,
      sample: data?.[0]
    })

    if (error) {
      console.error('[Template Sections API] Database error:', error)
      throw error
    }

    return NextResponse.json({ sections: data || [] })
  } catch (error: any) {
    console.error('[Template Sections API] Error fetching template sections:', error)
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
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create section' },
        { status: 500 }
      )
    }

    return NextResponse.json({ section: data })
  } catch (error) {
    console.error('Error creating section:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
