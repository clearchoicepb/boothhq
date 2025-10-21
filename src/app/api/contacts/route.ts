import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerSupabaseClient()

    // Get account_id filter from query params
    const { searchParams } = new URL(request.url)
    const accountIdFilter = searchParams.get('account_id')

    let query = supabase
      .from('contacts')
      .select(`
        *,
        accounts!contacts_account_id_fkey(id, name),
        contact_accounts(
          id,
          account_id,
          role,
          is_primary,
          start_date,
          end_date,
          accounts(id, name, account_type)
        )
      `)
      .eq('tenant_id', session.user.tenantId)

    // Apply account filter if provided
    if (accountIdFilter) {
      // Filter to contacts that have this account in contact_accounts
      // OR have the old account_id FK (backward compatibility)
      query = query.or(`account_id.eq.${accountIdFilter},contact_accounts.account_id.eq.${accountIdFilter}`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Transform the data to include account_name and contact_accounts arrays
    const transformedData = data?.map(contact => ({
      ...contact,
      account_name: contact.accounts?.name || null,
      // All accounts (from junction table)
      all_accounts: contact.contact_accounts?.map((ca: any) => ({
        ...ca.accounts,
        role: ca.role,
        is_primary: ca.is_primary,
        start_date: ca.start_date,
        end_date: ca.end_date,
        junction_id: ca.id
      })) || [],
      // Active accounts only (no end_date)
      active_accounts: contact.contact_accounts
        ?.filter((ca: any) => !ca.end_date)
        .map((ca: any) => ({
          ...ca.accounts,
          role: ca.role,
          is_primary: ca.is_primary,
          start_date: ca.start_date,
          junction_id: ca.id
        })) || [],
      // Former accounts (has end_date)
      former_accounts: contact.contact_accounts
        ?.filter((ca: any) => ca.end_date)
        .map((ca: any) => ({
          ...ca.accounts,
          role: ca.role,
          start_date: ca.start_date,
          end_date: ca.end_date,
          junction_id: ca.id
        })) || []
    })) || []

    const response = NextResponse.json(transformedData)
    
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
    const supabase = createServerSupabaseClient()

    // Filter to only include valid contact fields
    const contactData = {
      tenant_id: session.user.tenantId,
      account_id: body.account_id || null,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || null,
      phone: body.phone || null,
      job_title: body.job_title || null,
      department: body.department || null,
      address: body.address || null,
      avatar_url: body.avatar_url || null,
      status: body.status || 'active'
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single()

    if (error) {
      console.error('Error creating contact:', error)
      return NextResponse.json({ error: 'Failed to create contact', details: error }, { status: 500 })
    }

    // NEW: If account_id provided, create contact_accounts entry
    if (body.account_id) {
      const { error: junctionError } = await supabase
        .from('contact_accounts')
        .insert({
          contact_id: data.id,
          account_id: body.account_id,
          role: body.role || 'Primary Contact',
          is_primary: true, // First account is primary by default
          start_date: new Date().toISOString().split('T')[0],
          tenant_id: session.user.tenantId
        })
      
      if (junctionError) {
        console.error('Failed to create contact_accounts entry:', junctionError)
        // Don't fail the request, but log the error
        // The contact was created successfully, junction entry is supplementary
      }
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






