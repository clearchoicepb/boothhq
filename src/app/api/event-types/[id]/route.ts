import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
// PUT - Update event type
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, is_active, event_category_id } = body

    // If changing category, verify new category exists and belongs to tenant
    if (event_category_id) {
      const { data: category } = await supabase
        .from('event_categories')
        .select('id')
        .eq('id', event_category_id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (!category) {
        return NextResponse.json({ error: 'Event category not found' }, { status: 404 })
      }
    }

    // Generate new slug if name changed
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (is_active !== undefined) updateData.is_active = is_active
    if (event_category_id !== undefined) updateData.event_category_id = event_category_id

    const { data: eventType, error } = await supabase
      .from('event_types')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        event_categories(id, name, slug, color, icon)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ eventType })
  } catch (error: any) {
    console.error('Error updating event type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete event type (only if not system default and not used by events)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    // Check if system default
    const { data: eventType } = await supabase
      .from('event_types')
      .select('is_system_default')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventType?.is_system_default) {
      return NextResponse.json(
        { error: 'Cannot delete system default event types. Deactivate instead.' },
        { status: 400 }
      )
    }

    // Check if any events use this type
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event type that is used by existing events' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('event_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting event type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
