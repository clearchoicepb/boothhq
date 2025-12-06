import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:maintenance')

/**
 * GET - Get single maintenance history record by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { data, error } = await supabase
      .from('maintenance_history')
      .select(`
        *,
        performed_by_user:users!maintenance_history_performed_by_fkey(id, first_name, last_name, email),
        inventory_item:inventory_items!maintenance_history_inventory_item_id_fkey(id, item_name, item_category, serial_number)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 })
      }
      log.error({ error }, 'Error fetching maintenance history')
      return NextResponse.json(
        { error: 'Failed to fetch maintenance history', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update maintenance history record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params
    const body = await request.json()

    const { data, error } = await supabase
      .from('maintenance_history')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        performed_by_user:users!maintenance_history_performed_by_fkey(id, first_name, last_name, email),
        inventory_item:inventory_items!maintenance_history_inventory_item_id_fkey(id, item_name, item_category, serial_number)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 })
      }
      log.error({ error }, 'Error updating maintenance history')
      return NextResponse.json(
        { error: 'Failed to update maintenance history', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Delete maintenance history record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = params

    const { error } = await supabase
      .from('maintenance_history')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting maintenance history')
      return NextResponse.json(
        { error: 'Failed to delete maintenance history', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
