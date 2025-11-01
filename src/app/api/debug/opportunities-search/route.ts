import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q') || ''

    if (!searchTerm) {
      return NextResponse.json({ error: 'Please provide a search term using ?q=...' }, { status: 400 })
    }

    // Search for the term in opportunities, accounts, contacts, and leads
    const { data: opportunities, error } = await supabase
      .from('opportunities')
      .select(`
        id,
        name,
        stage,
        amount,
        probability,
        created_at,
        account_id,
        contact_id,
        lead_id,
        owner_id,
        tenant_id,
        accounts!opportunities_account_id_fkey(id, name, account_type),
        contacts!opportunities_contact_id_fkey(id, first_name, last_name, email),
        leads!opportunities_lead_id_fkey(id, first_name, last_name, email)
      `)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error searching opportunities:', error)
      return NextResponse.json({ error: 'Failed to search opportunities', details: error.message }, { status: 500 })
    }

    // Filter opportunities that match the search term
    const searchLower = searchTerm.toLowerCase()
    const matches = opportunities?.filter((opp: any) => {
      const oppName = (opp.name || '').toLowerCase()
      const accountName = (opp.accounts?.name || '').toLowerCase()
      const contactName = opp.contacts ?
        `${opp.contacts.first_name} ${opp.contacts.last_name}`.toLowerCase() : ''
      const leadName = opp.leads ?
        `${opp.leads.first_name} ${opp.leads.last_name}`.toLowerCase() : ''

      return oppName.includes(searchLower) ||
             accountName.includes(searchLower) ||
             contactName.includes(searchLower) ||
             leadName.includes(searchLower)
    }) || []

    return NextResponse.json({
      searchTerm,
      totalOpportunities: opportunities?.length || 0,
      matchesFound: matches.length,
      matches: matches.map((opp: any) => ({
        id: opp.id,
        name: opp.name,
        stage: opp.stage,
        amount: opp.amount,
        probability: opp.probability,
        account_name: opp.accounts?.name || null,
        contact_name: opp.contacts ?
          `${opp.contacts.first_name} ${opp.contacts.last_name}` : null,
        lead_name: opp.leads ?
          `${opp.leads.first_name} ${opp.leads.last_name}` : null,
        owner_id: opp.owner_id,
        created_at: opp.created_at,
        tenant_id: opp.tenant_id
      }))
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
