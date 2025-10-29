import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

/**
 * POST - Add contact to account (create relationship)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { contact_id, account_id, role, is_primary, start_date, notes } = body
    
    if (!contact_id || !account_id) {
      return NextResponse.json(
        { error: 'contact_id and account_id are required' },
        { status: 400 }
      )
    }
    
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    // If is_primary, unset other primary relationships for this contact
    if (is_primary) {
      await supabase
        .from('contact_accounts')
        .update({ is_primary: false })
        .eq('contact_id', contact_id)
        .eq('tenant_id', session.user.tenantId)
    }
    
    // Insert new relationship
    const { data, error } = await supabase
      .from('contact_accounts')
      .insert({
        contact_id,
        account_id,
        role: role || 'Contact',
        is_primary: is_primary || false,
        start_date: start_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        tenant_id: session.user.tenantId
      })
      .select(`
        *,
        accounts(id, name, account_type, industry),
        contacts(id, first_name, last_name, email, phone)
      `)
      .single()
    
    if (error) {
      console.error('Error creating contact-account relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Remove contact from account (delete relationship)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }
    
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    const { error } = await supabase
      .from('contact_accounts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
    
    if (error) {
      console.error('Error deleting contact-account relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update contact-account relationship (e.g., mark as ended, change role)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, end_date, role, is_primary, notes } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }
    
    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    // Build update object
    const updateData: any = {}
    if (end_date !== undefined) updateData.end_date = end_date
    if (role !== undefined) updateData.role = role
    if (notes !== undefined) updateData.notes = notes
    if (is_primary !== undefined) {
      updateData.is_primary = is_primary
      
      // If setting as primary, unset other primary relationships for this contact
      if (is_primary) {
        // First get the contact_id from this relationship
        const { data: relationship } = await supabase
          .from('contact_accounts')
          .select('contact_id')
          .eq('id', id)
          .single()
        
        if (relationship) {
          await supabase
            .from('contact_accounts')
            .update({ is_primary: false })
            .eq('contact_id', relationship.contact_id)
            .eq('tenant_id', session.user.tenantId)
            .neq('id', id)
        }
      }
    }
    
    const { data, error } = await supabase
      .from('contact_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .select(`
        *,
        accounts(id, name, account_type),
        contacts(id, first_name, last_name)
      `)
      .single()
    
    if (error) {
      console.error('Error updating contact-account relationship:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

