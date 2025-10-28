import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('filterType') || 'all'
    
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    let query = supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (filterType !== 'all') {
      query = query.eq('status', filterType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    const response = NextResponse.json(data)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json({ error: 'Failed to create lead', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}