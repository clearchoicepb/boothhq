import { createLogger } from '@/lib/logger'

const log = createLogger('lib')

/**
 * Replaces merge fields in templates with actual data
 * Merge fields format: {{field_name}}
 */

/**
 * Formats an address object to a string
 */
function formatAddress(address: any): string {
  if (!address) return ''
  
  const parts: string[] = []
  
  if (address.street1) parts.push(address.street1)
  if (address.street2) parts.push(address.street2)
  
  const cityStateZip: string[] = []
  if (address.city) cityStateZip.push(address.city)
  if (address.state) cityStateZip.push(address.state)
  if (address.zip || address.postal_code) cityStateZip.push(address.zip || address.postal_code)
  if (cityStateZip.length > 0) parts.push(cityStateZip.join(', '))
  
  if (address.country) parts.push(address.country)
  
  return parts.join('\n')
}

interface MergeFieldData {
  // Contact data
  contact_first_name?: string
  contact_last_name?: string
  contact_full_name?: string
  contact_email?: string
  contact_phone?: string

  // Lead data
  lead_first_name?: string
  lead_last_name?: string
  lead_full_name?: string
  lead_email?: string
  lead_phone?: string
  lead_company?: string

  // Account data
  account_name?: string
  account_phone?: string
  account_email?: string
  account_billing_address?: string
  account_shipping_address?: string

  // Opportunity data
  opportunity_name?: string
  opportunity_amount?: number

  // Event data
  event_title?: string
  event_location?: string
  event_start_date?: string
  event_end_date?: string
  event_start_time?: string
  event_end_time?: string
  event_setup_time?: string
  event_load_in_notes?: string
  event_total_amount?: number | null

  // Location data
  location_name?: string
  location_address?: string
  location_city?: string
  location_state?: string
  location_zip?: string

  // Invoice/Financial data
  invoice_number?: string
  invoice_total?: number
  invoice_amount_due?: number
  invoice_amount_paid?: number
  invoice_due_date?: string
  invoice_issue_date?: string
  invoice_deposit_amount?: number
  invoice_balance_due?: number
  invoice_payment_terms?: string
  invoice_status?: string

  // Legacy fields (for backwards compatibility)
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
  amount?: number
  event_date?: string
  setup_time?: string
  load_in_notes?: string
  contact_name?: string

  // Alias fields for template section compatibility
  total_amount?: number
  total_price?: number
  deposit_amount?: number
  balance_due_date?: string
  setup_date?: string
  current_date?: string

  // Custom fields
  [key: string]: any
}

export function replaceMergeFields(template: string, data: MergeFieldData): string {
  log.debug({ templateLength: template.length }, 'Processing template')
  log.debug({ dataKeys: Object.keys(data) }, 'Merge field data keys')

  let result = template

  // Replace each merge field
  Object.keys(data).forEach(key => {
    const value = data[key]

    // Skip null/undefined values
    if (value === null || value === undefined) {
      return
    }

    // Format the value
    let formattedValue = String(value)

    // Special formatting for certain fields
    
    // Currency fields
    if ((key === 'amount' || key === 'opportunity_amount' || key === 'event_total_amount' ||
         key === 'invoice_total' || key === 'invoice_amount_due' || key === 'invoice_amount_paid' ||
         key === 'invoice_deposit_amount' || key === 'invoice_balance_due' ||
         key === 'total_amount' || key === 'total_price' || key === 'deposit_amount') && typeof value === 'number') {
      formattedValue = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    } 
    // Date fields (long format)
    else if ((key === 'event_date' || key === 'event_start_date' || key === 'event_end_date' ||
              key === 'invoice_due_date' || key === 'invoice_issue_date' ||
              key === 'setup_date' || key === 'balance_due_date' || key === 'current_date') && value) {
      formattedValue = new Date(value).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } 
    // Time fields
    else if ((key === 'event_start_time' || key === 'event_end_time' || key === 'event_setup_time' || key === 'setup_time') && value) {
      // Format time from HH:MM:SS to h:MM AM/PM
      const timeParts = value.split(':')
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10)
        const minutes = timeParts[1]
        const period = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
        formattedValue = `${displayHours}:${minutes} ${period}`
      }
    }
    // Status fields (capitalize)
    else if (key === 'invoice_status' && value) {
      formattedValue = String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase()
    }

    // Replace all occurrences of {{field_name}}
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    log.debug({ key, formattedValue }, 'Replacing merge field')
    result = result.replace(regex, formattedValue)
  })

  log.debug({ resultLength: result.length }, 'Template processed')
  return result
}

/**
 * Fetches entity data for merge fields from various sources
 */
export async function getMergeFieldData(params: {
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string
  eventId?: string
  invoiceId?: string
}): Promise<MergeFieldData> {
  const data: MergeFieldData = {}

  log.debug({ params }, 'Fetching merge field data')

  try {
    // Fetch event data (agreements are linked to events)
    if (params.eventId) {
      const response = await fetch(`/api/events/${params.eventId}`)
      log.debug({ ok: response.ok }, 'Event response')
      if (response.ok) {
        const event = await response.json()
        log.debug({ eventId: event.id }, 'Event data fetched')

        // Event basic info
        data.event_title = event.title
        data.event_load_in_notes = event.load_in_notes

        // Legacy fields
        data.load_in_notes = event.load_in_notes

        // Event dates - get first and last event dates
        if (event.event_dates && event.event_dates.length > 0) {
          const sortedDates = [...event.event_dates].sort((a, b) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          )

          const firstDate = sortedDates[0]
          const lastDate = sortedDates[sortedDates.length - 1]

          data.event_start_date = firstDate.event_date
          data.event_start_time = firstDate.start_time
          data.event_end_date = lastDate.event_date
          data.event_end_time = lastDate.end_time

          // Setup time comes from first event_date, not from events table
          data.event_setup_time = firstDate.setup_time
          data.setup_time = firstDate.setup_time

          // Event location from first event date
          if (firstDate.locations) {
            data.event_location = firstDate.locations.name

            // Location-specific fields
            data.location_name = firstDate.locations.name
            data.location_address = firstDate.locations.address_line1
            data.location_city = firstDate.locations.city
            data.location_state = firstDate.locations.state
            data.location_zip = firstDate.locations.postal_code
          }
        }

        // Contact info from event
        if (event.contacts) {
          data.contact_first_name = event.contacts.first_name
          data.contact_last_name = event.contacts.last_name
          data.contact_email = event.contacts.email
          data.contact_phone = event.contacts.phone
          data.contact_full_name = `${event.contacts.first_name || ''} ${event.contacts.last_name || ''}`.trim()
          
          // Legacy fields
          data.first_name = event.contacts.first_name
          data.last_name = event.contacts.last_name
          data.email = event.contacts.email
          data.phone = event.contacts.phone
          data.contact_name = data.contact_full_name
        }

        // Account/company info from event
        if (event.accounts) {
          data.account_name = event.accounts.name
          data.account_phone = event.accounts.phone
          data.account_email = event.accounts.email

          // Format billing address from flat columns
          const billingAddr = {
            street1: event.accounts.billing_address_line_1,
            street2: event.accounts.billing_address_line_2,
            city: event.accounts.billing_city,
            state: event.accounts.billing_state,
            zip: event.accounts.billing_zip_code,
          }
          if (billingAddr.street1 || billingAddr.city) {
            data.account_billing_address = formatAddress(billingAddr)
          }

          // Format shipping address from flat columns
          const shippingAddr = {
            street1: event.accounts.shipping_address_line_1,
            street2: event.accounts.shipping_address_line_2,
            city: event.accounts.shipping_city,
            state: event.accounts.shipping_state,
            zip: event.accounts.shipping_zip_code,
          }
          if (shippingAddr.street1 || shippingAddr.city) {
            data.account_shipping_address = formatAddress(shippingAddr)
          }

          // Legacy field
          data.company_name = event.accounts.name
        }

        // Fetch invoice data from event (agreements use event + invoice data)
        try {
          const invoicesResponse = await fetch(`/api/invoices?event_id=${params.eventId}`)
          if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json()
            if (invoices && invoices.length > 0) {
              // Calculate total from all invoices
              const total = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
              data.event_total_amount = total
              
              // Use the first/primary invoice for detailed invoice fields
              const primaryInvoice = invoices[0]
              data.invoice_number = primaryInvoice.invoice_number || primaryInvoice.id
              data.invoice_total = primaryInvoice.total_amount
              data.invoice_amount_due = primaryInvoice.amount_due || primaryInvoice.total_amount
              data.invoice_amount_paid = primaryInvoice.amount_paid || 0
              data.invoice_balance_due = (primaryInvoice.amount_due || primaryInvoice.total_amount) - (primaryInvoice.amount_paid || 0)
              data.invoice_due_date = primaryInvoice.due_date
              data.invoice_issue_date = primaryInvoice.issue_date || primaryInvoice.created_at
              data.invoice_payment_terms = primaryInvoice.payment_terms || 'Due upon receipt'
              data.invoice_status = primaryInvoice.status
              
              // Extract deposit from line items if present
              if (primaryInvoice.line_items && Array.isArray(primaryInvoice.line_items)) {
                const depositItem = primaryInvoice.line_items.find((item: any) => 
                  item.description?.toLowerCase().includes('deposit') || 
                  item.name?.toLowerCase().includes('deposit')
                )
                if (depositItem) {
                  data.invoice_deposit_amount = depositItem.amount || depositItem.total
                }
              }
            }
          }
        } catch (err) {
          log.error({ err }, 'Error fetching event invoices')
          data.event_total_amount = null
        }
      }
    }

    // Fetch opportunity data
    if (params.opportunityId) {
      const response = await fetch(`/api/opportunities/${params.opportunityId}`)
      log.debug({ ok: response.ok }, 'Opportunity response')
      if (response.ok) {
        const opportunity = await response.json()
        log.debug({ opportunityId: opportunity.id }, 'Opportunity data fetched')
        data.opportunity_name = opportunity.name
        data.opportunity_amount = opportunity.amount
        
        // Legacy fields
        data.amount = opportunity.amount
        data.event_date = opportunity.event_date || opportunity.expected_close_date
      }
    }

    // Fetch account data
    if (params.accountId) {
      const response = await fetch(`/api/accounts/${params.accountId}`)
      log.debug({ ok: response.ok }, 'Account response')
      if (response.ok) {
        const account = await response.json()
        log.debug({ accountId: account.id }, 'Account data fetched')
        data.account_name = account.name
        data.account_phone = account.phone
        data.account_email = account.email

        // Format billing address from flat columns
        const billingAddr = {
          street1: account.billing_address_line_1,
          street2: account.billing_address_line_2,
          city: account.billing_city,
          state: account.billing_state,
          zip: account.billing_zip_code,
        }
        if (billingAddr.street1 || billingAddr.city) {
          data.account_billing_address = formatAddress(billingAddr)
        }

        // Format shipping address from flat columns
        const shippingAddr = {
          street1: account.shipping_address_line_1,
          street2: account.shipping_address_line_2,
          city: account.shipping_city,
          state: account.shipping_state,
          zip: account.shipping_zip_code,
        }
        if (shippingAddr.street1 || shippingAddr.city) {
          data.account_shipping_address = formatAddress(shippingAddr)
        }

        // Legacy field
        data.company_name = account.name
      }
    }

    // Fetch contact data
    if (params.contactId) {
      const response = await fetch(`/api/contacts/${params.contactId}`)
      log.debug({ ok: response.ok }, 'Contact response')
      if (response.ok) {
        const contact = await response.json()
        log.debug({ contactId: contact.id }, 'Contact data fetched')
        data.contact_first_name = contact.first_name
        data.contact_last_name = contact.last_name
        data.contact_full_name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
        data.contact_email = contact.email
        data.contact_phone = contact.phone
        
        // Legacy fields
        data.first_name = contact.first_name
        data.last_name = contact.last_name
        data.email = contact.email
        data.phone = contact.phone
      }
    }

    // Fetch lead data
    if (params.leadId) {
      const response = await fetch(`/api/leads/${params.leadId}`)
      log.debug({ ok: response.ok }, 'Lead response')
      if (response.ok) {
        const lead = await response.json()
        log.debug({ leadId: lead.id }, 'Lead data fetched')
        data.lead_first_name = lead.first_name
        data.lead_last_name = lead.last_name
        data.lead_full_name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
        data.lead_email = lead.email
        data.lead_phone = lead.phone
        data.lead_company = lead.company
        
        // Legacy fields
        data.first_name = lead.first_name
        data.last_name = lead.last_name
        data.email = lead.email
        data.phone = lead.phone
        data.company_name = lead.company
      }
    }

    // Fetch invoice data
    if (params.invoiceId) {
      const response = await fetch(`/api/invoices/${params.invoiceId}`)
      log.debug({ ok: response.ok }, 'Invoice response')
      if (response.ok) {
        const invoice = await response.json()
        log.debug({ invoiceId: invoice.id }, 'Invoice data fetched')
        
        data.invoice_number = invoice.invoice_number || invoice.id
        data.invoice_total = invoice.total_amount
        data.invoice_amount_due = invoice.amount_due || invoice.total_amount
        data.invoice_amount_paid = invoice.amount_paid || 0
        data.invoice_balance_due = (invoice.amount_due || invoice.total_amount) - (invoice.amount_paid || 0)
        data.invoice_due_date = invoice.due_date
        data.invoice_issue_date = invoice.issue_date || invoice.created_at
        data.invoice_payment_terms = invoice.payment_terms || 'Due upon receipt'
        data.invoice_status = invoice.status
        
        // Calculate deposit if applicable (could be a line item or percentage)
        if (invoice.line_items && Array.isArray(invoice.line_items)) {
          const depositItem = invoice.line_items.find((item: any) => 
            item.description?.toLowerCase().includes('deposit') || 
            item.name?.toLowerCase().includes('deposit')
          )
          if (depositItem) {
            data.invoice_deposit_amount = depositItem.amount || depositItem.total
          }
        }
      }
    }
  } catch (error) {
    log.error({ error }, 'Error fetching merge field data')
  }

  // Alias mappings for template section compatibility
  // These allow seeded template sections to work with existing merge fields
  if (data.event_total_amount !== undefined && data.event_total_amount !== null) {
    data.total_amount = data.event_total_amount
    data.total_price = data.event_total_amount
  }
  if (data.invoice_deposit_amount !== undefined) {
    data.deposit_amount = data.invoice_deposit_amount
  }
  if (data.invoice_due_date) {
    data.balance_due_date = data.invoice_due_date
  }
  if (data.event_start_date) {
    data.setup_date = data.event_start_date
  }

  log.debug({ dataKeys: Object.keys(data) }, 'Final merge field data')
  return data
}
