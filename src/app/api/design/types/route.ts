import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

// GET - Fetch all design types for tenant
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('design_item_types')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('display_order')

    if (error) throw error

    return NextResponse.json({ types: data || [] })
  } catch (error: any) {
    console.error('Error fetching design types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new design type
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('design_item_types')
      .insert({
        ...body,
        tenant_id: session.user.tenantId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ type: data })
  } catch (error: any) {
    console.error('Error creating design type:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
