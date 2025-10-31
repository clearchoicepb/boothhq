import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// GET - Fetch all add-ons
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabase
      .from('add_ons')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: addOns, error } = await query

    if (error) {
      console.error('Error fetching add-ons:', error)
      return NextResponse.json({
        error: 'Failed to fetch add-ons',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(addOns || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new add-on
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      unit = 'each',
      category,
      is_active = true,
      sort_order = 0,
    } = body

    if (!name || price === undefined) {
      return NextResponse.json({
        error: 'Missing required fields: name, price'
      }, { status: 400 })
    }

    const { data: addOn, error: createError } = await supabase
      .from('add_ons')
      .insert({
        tenant_id: dataSourceTenantId,
        name,
        description,
        price,
        unit,
        category,
        is_active,
        sort_order,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating add-on:', createError)
      return NextResponse.json({
        error: 'Failed to create add-on',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, addOn })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
