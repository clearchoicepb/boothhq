import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const opportunityId = params.id
    const body = await request.json()
    const { eventData = {}, eventDates } = body

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Start a transaction-like process
    try {
      // 1. Get the opportunity data with event_dates
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .select(`
          *,
          event_dates(*)
        `)
        .eq('id', opportunityId)
        .eq('tenant_id', session.user.tenantId)
        .single()

      if (oppError || !opportunity) {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      }

      // 1.5. If opportunity has a lead_id but no account_id, convert the lead
      let accountId = opportunity.account_id
      let contactId = opportunity.contact_id

      if (opportunity.lead_id && !opportunity.account_id) {
        console.log('Converting lead to account/contact...')

        // Fetch the lead data
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', opportunity.lead_id)
          .eq('tenant_id', session.user.tenantId)
          .single()

        if (leadError || !lead) {
          return NextResponse.json({ error: 'Lead not found for conversion' }, { status: 404 })
        }

        // Prepare conversion data
        const hasCompany = lead.company && lead.company.trim() !== ''

        const conversionData = {
          accountData: {
            name: hasCompany ? lead.company : `${lead.first_name} ${lead.last_name}`.trim(),
            email: lead.email || '',
            phone: lead.phone || '',
            website: lead.website || '',
            industry: lead.industry || '',
            size: '',
            account_type: hasCompany ? 'company' : 'individual'
          },
          contactData: hasCompany ? {
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email || '',
            phone: lead.phone || '',
            title: lead.title || '',
            department: ''
          } : null,
          mailingAddress: {
            address_line1: lead.address_line1 || '',
            address_line2: lead.address_line2 || '',
            city: lead.city || '',
            state: lead.state || '',
            postal_code: lead.postal_code || '',
            country: lead.country || 'US'
          },
          opportunityId: opportunityId
        }

        // Call internal conversion logic (we'll need to create the account directly here)
        // Create the account with billing_address as JSONB
        const billingAddress = {
          address_line1: conversionData.mailingAddress.address_line1 || '',
          address_line2: conversionData.mailingAddress.address_line2 || '',
          city: conversionData.mailingAddress.city || '',
          state: conversionData.mailingAddress.state || '',
          postal_code: conversionData.mailingAddress.postal_code || '',
          country: conversionData.mailingAddress.country || 'US'
        }

        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .insert({
            tenant_id: session.user.tenantId,
            name: conversionData.accountData.name,
            account_type: conversionData.accountData.account_type,
            email: conversionData.accountData.email,
            phone: conversionData.accountData.phone,
            website: conversionData.accountData.website,
            industry: conversionData.accountData.industry,
            billing_address: billingAddress,
            notes: `Converted from lead: ${lead.first_name} ${lead.last_name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (accountError) {
          console.error('Error creating account:', accountError)
          return NextResponse.json({
            error: 'Failed to create account during lead conversion',
            details: accountError.message
          }, { status: 500 })
        }

        accountId = account.id

        // Create contact if needed
        if (conversionData.contactData) {
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              tenant_id: session.user.tenantId,
              account_id: account.id,
              first_name: conversionData.contactData.first_name,
              last_name: conversionData.contactData.last_name,
              email: conversionData.contactData.email,
              phone: conversionData.contactData.phone,
              job_title: conversionData.contactData.title,
              department: conversionData.contactData.department,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (contactError) {
            console.error('Error creating contact during conversion:', contactError)
          } else if (contact) {
            contactId = contact.id
          }
        }

        // Update the lead to mark it as converted
        await supabase
          .from('leads')
          .update({
            is_converted: true,
            converted_at: new Date().toISOString(),
            converted_account_id: account.id,
            converted_contact_id: contactId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', opportunity.lead_id)
          .eq('tenant_id', session.user.tenantId)

        // Update the opportunity with account and contact IDs
        await supabase
          .from('opportunities')
          .update({
            account_id: accountId,
            contact_id: contactId,
            updated_at: new Date().toISOString()
          })
          .eq('id', opportunityId)
          .eq('tenant_id', session.user.tenantId)

        console.log('Lead converted successfully to account/contact')
      }

      // 2. Create the event
      // Get event dates from opportunity.event_dates
      const opportunityEventDates = opportunity.event_dates || eventDates || []

      // Calculate start and end dates from event_dates
      let startDate = new Date().toISOString()
      let endDate = null

      if (opportunityEventDates.length > 0) {
        const sortedDates = opportunityEventDates
          .map((d: any) => new Date(d.event_date))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime())

        startDate = sortedDates[0].toISOString()
        if (sortedDates.length > 1) {
          endDate = sortedDates[sortedDates.length - 1].toISOString()
        }
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          tenant_id: session.user.tenantId,
          account_id: accountId,
          contact_id: contactId,
          opportunity_id: opportunity.id,
          title: eventData?.title || opportunity.name,
          description: eventData?.description || opportunity.description,
          event_type: eventData?.event_type || opportunity.event_type || 'corporate',
          start_date: eventData?.start_date || startDate,
          end_date: eventData?.end_date || endDate,
          location: eventData?.location || null,
          status: eventData?.status || 'scheduled',
          date_type: eventData?.date_type || opportunity.date_type || 'single_day',
          mailing_address_line1: eventData?.mailing_address_line1 || opportunity.mailing_address_line1,
          mailing_address_line2: eventData?.mailing_address_line2 || opportunity.mailing_address_line2,
          mailing_city: eventData?.mailing_city || opportunity.mailing_city,
          mailing_state: eventData?.mailing_state || opportunity.mailing_state,
          mailing_postal_code: eventData?.mailing_postal_code || opportunity.mailing_postal_code,
          mailing_country: eventData?.mailing_country || opportunity.mailing_country || 'US',
          converted_from_opportunity_id: opportunity.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (eventError) {
        console.error('Error creating event:', eventError)
        return NextResponse.json({ 
          error: 'Failed to create event', 
          details: eventError.message 
        }, { status: 500 })
      }

      // 3. Copy event dates from opportunity to event
      let createdEventDates = []

      if (opportunityEventDates.length > 0) {
        const eventDatesData = opportunityEventDates.map((date: any) => ({
          tenant_id: session.user.tenantId,
          event_id: event.id,
          location_id: date.location_id,
          event_date: date.event_date,
          start_time: date.start_time,
          end_time: date.end_time,
          notes: date.notes || null,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { data: datesData, error: datesError } = await supabase
          .from('event_dates')
          .insert(eventDatesData)
          .select()

        if (datesError) {
          console.error('Error creating event dates:', datesError)
          // Don't fail the entire request, just log the error
        } else {
          createdEventDates = datesData || []
        }
      }

      // 4. Update the opportunity to mark it as converted
      const { error: oppUpdateError } = await supabase
        .from('opportunities')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_event_id: event.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunityId)
        .eq('tenant_id', session.user.tenantId)

      if (oppUpdateError) {
        console.error('Error updating opportunity:', oppUpdateError)
        return NextResponse.json({
          error: 'Failed to update opportunity',
          details: oppUpdateError.message
        }, { status: 500 })
      }

      // 5. Convert accepted quote to invoice if one exists
      let invoice = null
      const { data: acceptedQuote } = await supabase
        .from('quotes')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('status', 'accepted')
        .eq('tenant_id', session.user.tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (acceptedQuote) {
        // Get quote line items
        const { data: quoteLineItems } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('quote_id', acceptedQuote.id)
          .eq('tenant_id', session.user.tenantId)

        // Generate invoice number
        const { data: lastInvoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('tenant_id', session.user.tenantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let invoiceNumber = 'INV-0001'
        if (lastInvoice?.invoice_number) {
          const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[1] || '0')
          invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`
        }

        // Calculate due date (30 days after event start date)
        const dueDate = new Date(event.start_date)
        dueDate.setDate(dueDate.getDate() + 30)

        // Create invoice from quote
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            tenant_id: session.user.tenantId,
            account_id: accountId,
            contact_id: contactId,
            opportunity_id: opportunityId,
            event_id: event.id,
            invoice_number: invoiceNumber,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            subtotal: acceptedQuote.subtotal,
            tax_amount: acceptedQuote.tax_amount,
            total_amount: acceptedQuote.total_amount,
            status: 'draft',
            notes: acceptedQuote.notes
          })
          .select()
          .single()

        if (!invoiceError && newInvoice) {
          invoice = newInvoice

          // Create invoice line items from quote line items
          if (quoteLineItems && quoteLineItems.length > 0) {
            const invoiceLineItems = quoteLineItems.map(item => ({
              invoice_id: newInvoice.id,
              description: item.name + (item.description ? `\n${item.description}` : ''),
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total
            }))

            await supabase
              .from('invoice_line_items')
              .insert(invoiceLineItems)
          }

          // Update quote to link to invoice
          await supabase
            .from('quotes')
            .update({ invoice_id: newInvoice.id })
            .eq('id', acceptedQuote.id)
        }
      }

      const response = NextResponse.json({
        success: true,
        event,
        invoice,
        eventDates: createdEventDates,
        opportunity: {
          ...opportunity,
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_event_id: event.id
        },
        message: 'Opportunity successfully converted to event' + (invoice ? ' with invoice' : '')
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
