import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
// PUT - Update event category
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
    const { name, description, color, icon, is_active } = body

    // Generate new slug if name changed
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (color !== undefined) updateData.color = color
    if (icon !== undefined) updateData.icon = icon
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: category, error } = await supabase
      .from('event_categories')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ category })
  } catch (error: any) {
    console.error('Error updating event category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete event category (only if not system default and no types attached)
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
    const { data: category } = await supabase
      .from('event_categories')
      .select('is_system_default')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (category?.is_system_default) {
      return NextResponse.json(
        { error: 'Cannot delete system default categories. Deactivate instead.' },
        { status: 400 }
      )
    }

    // Check if any event types exist
    const { count } = await supabase
      .from('event_types')
      .select('*', { count: 'exact', head: true })
      .eq('event_category_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing event types' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('event_categories')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting event category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
