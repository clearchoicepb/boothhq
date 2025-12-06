import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:leads')
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id: leadId } = await params
    const body = await request.json()
    const { 
      accountData, 
      contactData, 
      opportunityId,
      mailingAddress 
    } = body

    // Start a transaction-like process
    try {
      // 1. Get the lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      // 2. Create the account
      const billingAddress = {
        address_line1: mailingAddress?.address_line1 || '',
        address_line2: mailingAddress?.address_line2 || '',
        city: mailingAddress?.city || '',
        state: mailingAddress?.state || '',
        postal_code: mailingAddress?.postal_code || '',
        country: mailingAddress?.country || 'US'
      }

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          tenant_id: dataSourceTenantId,
          name: accountData.name,
          account_type: accountData.account_type || 'individual',
          email: accountData.email,
          phone: accountData.phone,
          website: accountData.website,
          industry: accountData.industry,
          billing_address: billingAddress,
          notes: `Converted from lead: ${lead.first_name} ${lead.last_name}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (accountError) {
        log.error({ accountError }, 'Error creating account')
        return NextResponse.json({ 
          error: 'Failed to create account', 
          details: accountError.message 
        }, { status: 500 })
      }

      // 3. Create contact if contact data is provided
      let contact = null
      if (contactData && contactData.first_name && contactData.last_name) {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            tenant_id: dataSourceTenantId,
            account_id: account.id,
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            email: contactData.email || lead.email,
            phone: contactData.phone || lead.phone,
            job_title: contactData.title || null,
            department: contactData.department || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (contactError) {
          log.error({ contactError }, 'Error creating contact')
          // Don't fail the entire process, just log the error
        } else {
          contact = newContact
        }
      }

      // 4. Update the lead to mark it as converted
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_account_id: account.id,
          converted_contact_id: contact?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .eq('tenant_id', dataSourceTenantId)

      if (leadUpdateError) {
        log.error({ leadUpdateError }, 'Error updating lead')
        return NextResponse.json({ 
          error: 'Failed to update lead', 
          details: leadUpdateError.message 
        }, { status: 500 })
      }

      // 5. Update the opportunity if provided
      if (opportunityId) {
        const { error: oppUpdateError } = await supabase
          .from('opportunities')
          .update({
            account_id: account.id,
            contact_id: contact?.id || null,
            is_converted: true,
            converted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', opportunityId)
          .eq('tenant_id', dataSourceTenantId)

        if (oppUpdateError) {
          log.error({ oppUpdateError }, 'Error updating opportunity')
          // Don't fail the entire process, just log the error
        }
      }

      const response = NextResponse.json({
        success: true,
        account,
        contact,
        lead: {
          ...lead,
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_account_id: account.id,
          converted_contact_id: contact?.id || null
        }
      })

      // Add caching headers
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

      return response

    } catch (error) {
      log.error({ error }, 'Error in conversion process')
      return NextResponse.json({ 
        error: 'Conversion failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
