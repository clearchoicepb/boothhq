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

    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunity_id')
    const accountId = searchParams.get('account_id')
    const contactId = searchParams.get('contact_id')
    const leadId = searchParams.get('lead_id')
    const eventId = searchParams.get('event_id')

    let query = supabase
      .from('communications')
      .select(`
        *,
        contacts (
          first_name,
          last_name
        ),
        accounts (
          name
        ),
        leads (
          first_name,
          last_name
        )
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('communication_date', { ascending: false })

    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId)
    }
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communications:', error)
      return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
    }

    return NextResponse.json(data)
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

    const communicationData = {
      ...body,
      tenant_id: session.user.tenantId,
      created_by: session.user.id,
    }

    const { data, error } = await supabase
      .from('communications')
      .insert(communicationData)
      .select(`
        *,
        contacts (
          first_name,
          last_name
        ),
        accounts (
          name
        ),
        leads (
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating communication:', error)
      return NextResponse.json({ error: 'Failed to create communication', details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
