import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
// GET - Fetch all event categories for tenant
export async function GET(request: Request) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { data: categories, error } = await supabase
      .from('event_categories')
      .select(`
        *,
        event_types(count)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    console.error('Error fetching event categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new event category
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  , { status: 401 })
  }

  // Admin only
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, color, icon } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Get next display_order
    const { data: maxOrder } = await supabase
      .from('event_categories')
      .select('display_order')
      .eq('tenant_id', dataSourceTenantId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.display_order || 0) + 1

    const { data: category, error } = await supabase
      .from('event_categories')
      .insert({
        tenant_id: dataSourceTenantId,
        name,
        slug,
        description,
        color: color || '#6B7280', // Default gray
        icon: icon || 'calendar',
        display_order: nextOrder,
        is_system_default: false,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating event category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Batch update (for reordering)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  , { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { updates } = body // Array of { id, display_order }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 })
    }

    // Update each category
    const promises = updates.map(({ id, ...data }) =>
      supabase
        .from('event_categories')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', dataSourceTenantId)
    )

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating event categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
