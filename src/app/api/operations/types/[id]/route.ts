/**
 * Operations Types [id] API Routes
 *
 * GET    - Fetch single operations type
 * PUT    - Update operations type
 * DELETE - Delete operations type
 *
 * Uses tenant-helpers for proper multi-tenant database isolation.
 */

import {
  getTenantContext,
  updateWithTenantId,
  deleteWithTenantId,
  isErrorResponse
} from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'

// GET - Fetch single operations type
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getTenantContext()
  if (isErrorResponse(context)) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('operations_item_types')
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
  if (isErrorResponse(context)) return context

  const { supabase, dataSourceTenantId, session } = context

  try {
    const { id } = await params
    const body = await request.json()

    // Use helper for proper tenant isolation and audit trail
    const { data, error } = await updateWithTenantId(
      supabase,
      'operations_item_types' as any, // Type assertion needed for new table
      id,
      {
        name: body.name,
        description: body.description,
        category: body.category,
        due_date_days: body.due_date_days,
        urgent_threshold_days: body.urgent_threshold_days,
        missed_deadline_days: body.missed_deadline_days,
        is_auto_added: body.is_auto_added,
        is_active: body.is_active,
        display_order: body.display_order
      },
      dataSourceTenantId,
      session.user.id
    )

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
  if (isErrorResponse(context)) return context

  const { supabase, dataSourceTenantId } = context

  try {
    const { id } = await params

    // Use helper for proper tenant isolation
    const { error } = await deleteWithTenantId(
      supabase,
      'operations_item_types' as any, // Type assertion needed for new table
      id,
      dataSourceTenantId
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting operations type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
