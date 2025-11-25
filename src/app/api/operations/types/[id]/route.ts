/**
 * Operations Types [id] API Routes
 *
 * GET    - Fetch single operations type
 * PUT    - Update operations type
 * DELETE - Delete operations type
 *
 * Follows the same pattern as /api/design/types/[id] for consistency.
 * Uses tenant-helpers for proper multi-tenant database isolation.
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'

// GET - Fetch single operations type
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('operations_item_types' as any)
      .select('*')
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) throw error

    return NextResponse.json({ type: data })
  } catch (error: any) {
    console.error('Error fetching operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Update operations type
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const body = await request.json()

    // Use direct supabase update (matches design API pattern)
    const { data, error } = await supabase
      .from('operations_item_types' as any)
      .update({
        name: body.name,
        description: body.description,
        category: body.category,
        due_date_days: body.due_date_days,
        urgent_threshold_days: body.urgent_threshold_days,
        missed_deadline_days: body.missed_deadline_days,
        is_auto_added: body.is_auto_added,
        is_active: body.is_active,
        display_order: body.display_order
      })
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ type: data })
  } catch (error: any) {
    console.error('Error updating operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete operations type
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const { error } = await supabase
      .from('operations_item_types' as any)
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
