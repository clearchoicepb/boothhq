import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const isOneTime = searchParams.get('isOneTime')
    
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('name', { ascending: true })

    // Filter by search term if provided
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Filter by one-time status if provided
    if (isOneTime !== null) {
      query = query.eq('is_one_time', isOneTime === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    const response = NextResponse.json(data)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
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
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('locations')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating location:', error)
      return NextResponse.json({ error: 'Failed to create location', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}















