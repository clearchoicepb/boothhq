import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - Fetch a single package
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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: package_data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error || !package_data) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    return NextResponse.json(package_data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a package
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
    const {
      name,
      description,
      base_price,
      category,
      is_active,
      sort_order,
    } = body

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (base_price !== undefined) updateData.base_price = base_price
    if (category !== undefined) updateData.category = category
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data: package_data, error: updateError } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating package:', updateError)
      return NextResponse.json({
        error: 'Failed to update package',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, package: package_data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a package
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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error: deleteError } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (deleteError) {
      console.error('Error deleting package:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete package',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
