import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('id') || '9a45848a-718c-45cf-bf6f-ef81864ce57c'

    // Check 1: Is the opportunity in the database?
    const { data: directQuery, error: directError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (directError && directError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Database error', details: directError.message }, { status: 500 })
    }

    // Check 2: Does it show up in the entities endpoint query (what the frontend uses)?
    const { data: entitiesQuery, error: entitiesError } = await supabase
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_account_id_fkey(name, account_type),
        contacts!opportunities_contact_id_fkey(first_name, last_name)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    const foundInList = entitiesQuery?.find((o: any) => o.id === opportunityId)

    // Check 3: Check with stage filter
    const { data: withStageFilter, error: stageError } = await supabase
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_account_id_fkey(name, account_type),
        contacts!opportunities_contact_id_fkey(first_name, last_name)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('stage', directQuery?.stage)
      .order('created_at', { ascending: false })

    const foundWithStageFilter = withStageFilter?.find((o: any) => o.id === opportunityId)

    return NextResponse.json({
      opportunityId,
      checks: {
        existsInDatabase: !!directQuery,
        foundInFullList: !!foundInList,
        foundWithStageFilter: !!foundWithStageFilter,
        totalOpportunitiesInList: entitiesQuery?.length || 0,
        totalWithSameStage: withStageFilter?.length || 0,
        positionInList: entitiesQuery?.findIndex((o: any) => o.id === opportunityId) ?? -1,
      },
      opportunityData: directQuery ? {
        id: directQuery.id,
        name: directQuery.name,
        stage: directQuery.stage,
        amount: directQuery.amount,
        probability: directQuery.probability,
        owner_id: directQuery.owner_id,
        account_id: directQuery.account_id,
        contact_id: directQuery.contact_id,
        created_at: directQuery.created_at,
        tenant_id: directQuery.tenant_id
      } : null,
      withJoins: foundInList ? {
        ...foundInList,
        account_name: foundInList.accounts?.name,
        contact_name: foundInList.contacts ?
          `${foundInList.contacts.first_name} ${foundInList.contacts.last_name}` : null
      } : null
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
