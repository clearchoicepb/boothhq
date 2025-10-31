import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// Create a new contract record
export async function POST(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const body = await request.json()
    const {
      opportunityId,
      accountId,
      contactId,
      leadId,
      templateId,
      templateName,
      content,
      recipientEmail,
      recipientName,
      status = 'draft',
    } = body

    if (!content || !recipientEmail) {
      return NextResponse.json({
        error: 'Missing required fields: content, recipientEmail'
      }, { status: 400 })
    }

    // Generate contract number
    const { data: contractNumber } = await supabase
      .rpc('generate_contract_number', { p_tenant_id: dataSourceTenantId })

    // Create contract record
    const { data: contract, error: createError } = await supabase
      .from('contracts')
      .insert({
        tenant_id: dataSourceTenantId,
        opportunity_id: opportunityId || null,
        account_id: accountId || null,
        contact_id: contactId || null,
        lead_id: leadId || null,
        template_id: templateId || null,
        template_name: templateName,
        contract_number: contractNumber || `CONTRACT-${Date.now()}`,
        content,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating contract:', createError)
      return NextResponse.json({
        error: 'Failed to create contract',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, contract })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get contracts for an entity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const opportunityId = searchParams.get('opportunityId')
    const accountId = searchParams.get('accountId')
    const contactId = searchParams.get('contactId')
    const leadId = searchParams.get('leadId')

    let query = supabase
      .from('contracts')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

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

    const { data: contracts, error } = await query

    if (error) {
      console.error('Error fetching contracts:', error)
      return NextResponse.json({
        error: 'Failed to fetch contracts',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(contracts || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
