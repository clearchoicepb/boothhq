import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching equipment categories:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment categories' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data, error } = await supabase
      .from('equipment_categories')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating equipment category:', error)
      return NextResponse.json({ error: 'Failed to create equipment category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






