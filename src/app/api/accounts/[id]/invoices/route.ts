import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'upcoming', 'all'

    let query = supabase
      .from('invoices')
      .select(`
        *,
        events!invoices_event_id_fkey(name, event_date)
      `)
      .eq('account_id', id)
      .eq('tenant_id', session.user.tenantId)
      .order('due_date', { ascending: true })

    if (type === 'upcoming') {
      query = query.gte('due_date', new Date().toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching account invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
