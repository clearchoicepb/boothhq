import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

// GET - Fetch all event types for tenant (optionally filtered by category)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('event_types')
      .select(`
        *,
        event_categories(id, name, slug, color, icon)
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('display_order', { ascending: true })

    // Apply category filter if provided
    if (categoryId) {
      query = query.eq('event_category_id', categoryId)
    }

    const { data: eventTypes, error } = await query

    if (error) throw error

    return NextResponse.json({ eventTypes: eventTypes || [] })
  } catch (error: any) {
    console.error('Error fetching event types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new event type
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin only
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, event_category_id, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!event_category_id) {
      return NextResponse.json({ error: 'Event category ID is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Verify category exists and belongs to tenant
    const { data: category } = await supabase
      .from('event_categories')
      .select('id')
      .eq('id', event_category_id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (!category) {
      return NextResponse.json({ error: 'Event category not found' }, { status: 404 })
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Get next display_order for this category
    const { data: maxOrder } = await supabase
      .from('event_types')
      .select('display_order')
      .eq('tenant_id', session.user.tenantId)
      .eq('event_category_id', event_category_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.display_order || 0) + 1

    const { data: eventType, error } = await supabase
      .from('event_types')
      .insert({
        tenant_id: session.user.tenantId,
        event_category_id,
        name,
        slug,
        description,
        display_order: nextOrder,
        is_system_default: false,
        created_by: session.user.id
      })
      .select(`
        *,
        event_categories(id, name, slug, color, icon)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ eventType }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating event type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Batch update (for reordering)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const supabase = createServerSupabaseClient()

    // Update each event type
    const promises = updates.map(({ id, ...data }) =>
      supabase
        .from('event_types')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', session.user.tenantId)
    )

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating event types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
