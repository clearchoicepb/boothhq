import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:opportunities')
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, tenantId, session } = context
    const params = await routeContext.params
    const opportunityId = params.id
    const body = await request.json()
    const { eventData = {}, eventDates } = body

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
        .eq('tenant_id', dataSourceTenantId)
        .single()

      if (oppError || !opportunity) {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      }

      // 1.5. If opportunity has a lead_id but no account_id, convert the lead
      let accountId = opportunity.account_id
      let contactId = opportunity.contact_id

      if (opportunity.lead_id && !opportunity.account_id) {
        log.debug({}, 'Converting lead to account/contact...')

        // Fetch the lead data
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('id', opportunity.lead_id)
          .eq('tenant_id', dataSourceTenantId)
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
            tenant_id: dataSourceTenantId,
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
          log.error({ accountError }, 'Error creating account')
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
              tenant_id: dataSourceTenantId,
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
            log.error({ contactError }, 'Error creating contact during conversion')
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
          .eq('tenant_id', dataSourceTenantId)

        // Update the opportunity with account and contact IDs
        await supabase
          .from('opportunities')
          .update({
            account_id: accountId,
            contact_id: contactId,
            updated_at: new Date().toISOString()
          })
          .eq('id', opportunityId)
          .eq('tenant_id', dataSourceTenantId)

        log.debug({}, 'Lead converted successfully to account/contact')
      }

      // 2. Create the event
      // Get event dates from opportunity.event_dates
      const opportunityEventDates = opportunity.event_dates || eventDates || []

      // Calculate start and end dates from event_dates
      // Use date-only format (YYYY-MM-DD) to avoid timezone conversion issues
      let startDate = new Date().toISOString().split('T')[0]
      let endDate = null
      let primaryLocationId = null

      if (opportunityEventDates.length > 0) {
        // Extract event_date strings and sort them (already in YYYY-MM-DD format)
        const sortedDates = opportunityEventDates
          .map((d: any) => d.event_date)
          .filter(Boolean)
          .sort()

        if (sortedDates.length > 0) {
          startDate = sortedDates[0]
          if (sortedDates.length > 1) {
            endDate = sortedDates[sortedDates.length - 1]
          }
        }

        // Get the location_id from the first event_date as the primary location
        primaryLocationId = opportunityEventDates[0]?.location_id || null
      }

      // Lookup event_type_id from event_type string (for workflow triggering)
      let eventTypeId = null
      let eventCategoryId = null

      if (eventData?.event_type || opportunity.event_type) {
        const eventTypeSlug = (eventData?.event_type || opportunity.event_type)
          .toLowerCase()
          .replace(/\s+/g, '_')
        
        const { data: eventTypeData } = await supabase
          .from('event_types')
          .select('id, event_category_id')
          .eq('tenant_id', dataSourceTenantId)
          .eq('slug', eventTypeSlug)
          .maybeSingle()
        
        if (eventTypeData) {
          eventTypeId = eventTypeData.id
          eventCategoryId = eventTypeData.event_category_id
          log.debug({ eventTypeId, slug: eventTypeSlug }, 'Found event_type_id for slug')
        } else {
          log.warn({ slug: eventTypeSlug }, '[Convert to Event] Could not find event_type_id for slug')
        }
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          tenant_id: dataSourceTenantId,
          account_id: accountId,
          contact_id: contactId,
          opportunity_id: opportunity.id,
          title: eventData?.title || opportunity.name,
          description: eventData?.description || opportunity.description,
          event_type: eventData?.event_type || opportunity.event_type || 'corporate',
          event_type_id: eventTypeId,
          event_category_id: eventCategoryId,
          start_date: eventData?.start_date || startDate,
          end_date: eventData?.end_date || endDate,
          location: eventData?.location || null,
          location_id: eventData?.location_id || primaryLocationId,
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
        log.error({ eventError }, 'Error creating event')
        return NextResponse.json({ 
          error: 'Failed to create event', 
          details: eventError.message 
        }, { status: 500 })
      }

      // 3. Copy event dates from opportunity to event
      let createdEventDates = []

      if (opportunityEventDates.length > 0) {
        const eventDatesData = opportunityEventDates.map((date: any) => ({
          tenant_id: dataSourceTenantId,
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
          log.error({ datesError }, 'Error creating event dates')
          // Don't fail the entire request, just log the error
        } else {
          createdEventDates = datesData || []
        }
      }

      // 3.5. Execute workflows for this event type (if event_type_id was found)
      if (event.event_type_id) {
        try {
          log.debug({ eventTypeId: event.event_type_id }, 'Executing workflows for event type')
          
          // Import workflowEngine dynamically
          const { workflowEngine } = await import('@/lib/services/workflowEngine')
          
          const workflowResults = await workflowEngine.executeWorkflowsForEvent({
            eventId: event.id,
            eventTypeId: event.event_type_id,
            tenantId,
            dataSourceTenantId,
            supabase,
            userId: session.user.id,
          })
          
          if (workflowResults && workflowResults.length > 0) {
            const totalTasks = workflowResults.reduce((sum, result) => {
              return sum + (result?.createdTaskIds?.length || 0)
            }, 0)
            const totalDesignItems = workflowResults.reduce((sum, result) => {
              return sum + (result?.createdDesignItemIds?.length || 0)
            }, 0)
            log.debug({ workflowCount: workflowResults.length, taskCount: totalTasks, designItemCount: totalDesignItems }, '✅ Executed workflows')
          } else {
            log.debug({ eventTypeId: event.event_type_id }, 'ℹ️  No active workflows found for event type')
          }
        } catch (error) {
          log.error({ error }, '[Convert to Event] Error executing workflows')
          // Don't fail the conversion, just log
        }
      } else {
        log.debug({}, '⚠️  No event_type_id found, skipping workflow execution')
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
        .eq('tenant_id', dataSourceTenantId)

      if (oppUpdateError) {
        log.error({ oppUpdateError }, 'Error updating opportunity')
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
        .eq('tenant_id', dataSourceTenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (acceptedQuote) {
        // Get quote line items
        const { data: quoteLineItems } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('quote_id', acceptedQuote.id)
          .eq('tenant_id', dataSourceTenantId)

        // Generate invoice number
        const { data: lastInvoice } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('tenant_id', dataSourceTenantId)
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
            tenant_id: dataSourceTenantId,
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
