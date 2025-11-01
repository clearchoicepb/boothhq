import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all'
    const equipmentTypeFilter = searchParams.get('equipment_type') || 'all'
    const boothIdFilter = searchParams.get('booth_id') || 'all'

    let query = supabase
      .from('equipment_items')
      .select(`
        *,
        booths!equipment_items_booth_id_fkey(booth_name, booth_type),
        assigned_to_user:users!equipment_items_assigned_to_user_id_fkey(first_name, last_name),
        assigned_to_event:events!equipment_items_assigned_to_event_id_fkey(title, start_date, end_date)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('item_id', { ascending: true })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (equipmentTypeFilter !== 'all') {
      query = query.eq('equipment_type', equipmentTypeFilter)
    }

    if (boothIdFilter !== 'all') {
      query = query.eq('booth_id', boothIdFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching equipment items:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment items' }, { status: 500 })
    }

    // Transform the data to include booth_name, assigned_user_name, and assigned_event_name
    const transformedData = data?.map(item => ({
      ...item,
      booth_name: item.booths?.booth_name || null,
      booth_type: item.booths?.booth_type || null,
      assigned_user_name: item.assigned_to_user ?
        `${item.assigned_to_user.first_name} ${item.assigned_to_user.last_name}`.trim() : null,
      assigned_event_name: item.assigned_to_event?.title || null,
      assigned_event_start_date: item.assigned_to_event?.start_date || null,
      assigned_event_end_date: item.assigned_to_event?.end_date || null
    })) || []

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    const { data, error } = await supabase
      .from('equipment_items')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating equipment item:', error)
      return NextResponse.json({ error: 'Failed to create equipment item' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
