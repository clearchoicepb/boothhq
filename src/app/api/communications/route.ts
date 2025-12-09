import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:communications')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunity_id')
    const accountId = searchParams.get('account_id')
    const contactId = searchParams.get('contact_id')
    const leadId = searchParams.get('lead_id')
    const eventId = searchParams.get('event_id')
    const communicationType = searchParams.get('communication_type')
    const since = searchParams.get('since')

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
      .eq('tenant_id', dataSourceTenantId)
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
    if (communicationType) {
      query = query.eq('communication_type', communicationType)
    }
    if (since) {
      query = query.gte('communication_date', since)
    }

    console.log('🔍 [Communications API] Query params:', {
      tenantId: dataSourceTenantId,
      communicationType,
      since,
      opportunityId,
      accountId,
      contactId,
      leadId,
      eventId
    })

    const { data, error } = await query

    if (error) {
      log.error({ error }, '❌ [Communications API] Error fetching communications')
      return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
    }

    console.log('✅ [Communications API] Returned', data?.length, 'messages')
    console.log('📊 [Communications API] Directions:', data?.map(d => d.direction).join(', '))
    
    // Debug relationship data for first 3 messages
    if (data && data.length > 0) {
      log.debug({}, '🔍 [Communications API] Sample relationship data')
      data.slice(0, 3).forEach((msg, i) => {
        console.log(`  Message ${i + 1}:`, {
          id: msg.id,
          contact_id: msg.contact_id,
          lead_id: msg.lead_id,
          account_id: msg.account_id,
          hasContactData: !!msg.contacts,
          hasLeadData: !!msg.leads,
          hasAccountData: !!msg.accounts,
          contactName: msg.contacts ? `${msg.contacts.first_name} ${msg.contacts.last_name}` : null,
          leadName: msg.leads ? `${msg.leads.first_name} ${msg.leads.last_name}` : null,
          accountName: msg.accounts?.name || null,
          metadata: msg.metadata
        })
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()

    // Log what we're receiving for debugging
    log.debug({
      ...body,
      // Redact sensitive info, just show structure
      hasEventId: !!body.event_id,
      hasAccountId: !!body.account_id,
      hasContactId: !!body.contact_id,
      communicationType: body.communication_type,
    }, 'Received data')

    const communicationData = {
      ...body,
      tenant_id: dataSourceTenantId,
      // Audit trail: track who created this communication
      created_by: session.user.id,
      updated_by: session.user.id,
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
      log.error({ error }, '[Communications POST] Error creating communication')
      log.error({ communicationData }, '[Communications POST] Failed data')
      return NextResponse.json({ error: 'Failed to create communication', details: error.message }, { status: 500 })
    }

    log.debug({ communicationId: data.id }, 'Success! Created communication')

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
