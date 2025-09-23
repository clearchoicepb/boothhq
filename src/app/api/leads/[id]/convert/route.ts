import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: leadId } = await params
    const body = await request.json()
    const { 
      accountData, 
      contactData, 
      opportunityId,
      mailingAddress 
    } = body

    const supabase = createServerSupabaseClient()

    // Start a transaction-like process
    try {
      // 1. Get the lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('tenant_id', session.user.tenantId)
        .single()

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      // 2. Create the account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          tenant_id: session.user.tenantId,
          name: accountData.name,
          email: accountData.email,
          phone: accountData.phone,
          website: accountData.website,
          industry: accountData.industry,
          size: accountData.size,
          address_line1: mailingAddress?.address_line1 || null,
          address_line2: mailingAddress?.address_line2 || null,
          city: mailingAddress?.city || null,
          state: mailingAddress?.state || null,
          postal_code: mailingAddress?.postal_code || null,
          country: mailingAddress?.country || 'US',
          notes: `Converted from lead: ${lead.first_name} ${lead.last_name}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (accountError) {
        console.error('Error creating account:', accountError)
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
            tenant_id: session.user.tenantId,
            account_id: account.id,
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            email: contactData.email || lead.email,
            phone: contactData.phone || lead.phone,
            title: contactData.title || null,
            department: contactData.department || null,
            notes: `Converted from lead: ${lead.first_name} ${lead.last_name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (contactError) {
          console.error('Error creating contact:', contactError)
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
        .eq('tenant_id', session.user.tenantId)

      if (leadUpdateError) {
        console.error('Error updating lead:', leadUpdateError)
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
          .eq('tenant_id', session.user.tenantId)

        if (oppUpdateError) {
          console.error('Error updating opportunity:', oppUpdateError)
          // Don't fail the entire process, just log the error
        }
      }

      console.log('Lead conversion completed successfully:', {
        leadId,
        accountId: account.id,
        contactId: contact?.id,
        opportunityId
      })

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
      console.error('Error in conversion process:', error)
      return NextResponse.json({ 
        error: 'Conversion failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
