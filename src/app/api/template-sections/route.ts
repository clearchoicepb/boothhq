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

    // Fetch system sections (tenant_id = NULL) and tenant-specific sections
    let query = supabase
      .from('template_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    // Get both system sections and tenant sections
    // System sections: tenant_id IS NULL
    // Tenant sections: tenant_id = dataSourceTenantId
    const systemQuery = supabase
      .from('template_sections')
      .select('*')
      .is('tenant_id', null)
      .order('sort_order', { ascending: true })

    const tenantQuery = supabase
      .from('template_sections')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })

    if (category) {
      systemQuery.eq('category', category)
      tenantQuery.eq('category', category)
    }

    const [systemResult, tenantResult] = await Promise.all([
      systemQuery,
      tenantQuery
    ])

    if (systemResult.error) throw systemResult.error
    if (tenantResult.error) throw tenantResult.error

    // Combine system and tenant sections
    const allSections = [...(systemResult.data || []), ...(tenantResult.data || [])]

    // Sort by sort_order
    allSections.sort((a, b) => a.sort_order - b.sort_order)

    return NextResponse.json({ sections: allSections })
  } catch (error) {
    console.error('Error fetching template sections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
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
