import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'
import { revalidatePath } from 'next/cache'

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

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        accounts!contacts_account_id_fkey(id, name, account_type),
        contact_accounts(
          id,
          role,
          is_primary,
          start_date,
          end_date,
          notes,
          accounts(id, name, account_type, industry, email, phone)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching contact:', error)
      return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Transform the data to add helper properties
    const transformedData = {
      ...data,
      // Backward compatibility - single account_name
      account_name: data.accounts?.name || null,
      
      // Primary account (backward compatibility)
      primary_account: data.contact_accounts?.find((ca: any) => ca.is_primary)?.accounts || null,
      
      // All accounts (new many-to-many)
      all_accounts: data.contact_accounts?.map((ca: any) => ({
        ...ca.accounts,
        role: ca.role,
        is_primary: ca.is_primary,
        start_date: ca.start_date,
        end_date: ca.end_date,
        notes: ca.notes,
        junction_id: ca.id
      })) || [],
      
      // Active accounts only (no end_date)
      active_accounts: data.contact_accounts
        ?.filter((ca: any) => !ca.end_date)
        .map((ca: any) => ({
          ...ca.accounts,
          role: ca.role,
          is_primary: ca.is_primary,
          start_date: ca.start_date,
          junction_id: ca.id
        })) || [],
      
      // Former accounts (has end_date)
      former_accounts: data.contact_accounts
        ?.filter((ca: any) => ca.end_date)
        .map((ca: any) => ({
          ...ca.accounts,
          role: ca.role,
          start_date: ca.start_date,
          end_date: ca.end_date,
          junction_id: ca.id
        })) || []
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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data, error } = await supabase
      .from('contacts')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact:', error)
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    // NEW: Handle account_id changes in contact_accounts junction table
    if (body.account_id) {
      // Get current primary account relationship
      const { data: currentPrimary } = await supabase
        .from('contact_accounts')
        .select('*')
        .eq('contact_id', id)
        .eq('is_primary', true)
        .is('end_date', null)
        .eq('tenant_id', session.user.tenantId)
        .maybeSingle()
      
      // If changing to a different account
      if (!currentPrimary || currentPrimary.account_id !== body.account_id) {
        // End current primary relationship (if exists)
        if (currentPrimary) {
          await supabase
            .from('contact_accounts')
            .update({
              is_primary: false,
              end_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', currentPrimary.id)
        }
        
        // Check if relationship with new account already exists
        const { data: existing } = await supabase
          .from('contact_accounts')
          .select('*')
          .eq('contact_id', id)
          .eq('account_id', body.account_id)
          .eq('tenant_id', session.user.tenantId)
          .maybeSingle()
        
        if (existing) {
          // Reactivate existing relationship
          await supabase
            .from('contact_accounts')
            .update({
              is_primary: true,
              end_date: null
            })
            .eq('id', existing.id)
        } else {
          // Create new relationship
          const { error: junctionError } = await supabase
            .from('contact_accounts')
            .insert({
              contact_id: id,
              account_id: body.account_id,
              role: body.role || 'Primary Contact',
              is_primary: true,
              start_date: new Date().toISOString().split('T')[0],
              tenant_id: session.user.tenantId
            })
          
          if (junctionError) {
            console.error('Failed to create contact_accounts entry:', junctionError)
            // Don't fail the request, junction entry is supplementary
          }
        }
      }
    }

    // Revalidate the contacts list page to show updated contact immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/contacts`)

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
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting contact:', error)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
