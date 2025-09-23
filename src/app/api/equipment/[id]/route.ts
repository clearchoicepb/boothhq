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

    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        equipment_categories!equipment_category_id_fkey(name)
      `)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Transform the data to include category_name
    const transformedData = {
      ...data,
      category_name: data.equipment_categories?.name || null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('equipment')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment:', error)
      return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting equipment:', error)
      return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
