import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'upcoming', 'previous', 'all'

    let query = supabase
      .from('events')
      .select('*')
      .eq('account_id', id)
      .eq('tenant_id', dataSourceTenantId)
      .order('start_date', { ascending: true })

    if (type === 'upcoming') {
      query = query.gte('start_date', new Date().toISOString().split('T')[0])
    } else if (type === 'previous') {
      query = query.lt('start_date', new Date().toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching account events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
