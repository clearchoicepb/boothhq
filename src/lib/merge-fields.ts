/**
 * Replaces merge fields in templates with actual data
 * Merge fields format: {{field_name}}
 */

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
  event_total_amount?: number

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

  // Custom fields
  [key: string]: any
}

export function replaceMergeFields(template: string, data: MergeFieldData): string {
  console.log('[replaceMergeFields] Template:', template)
  console.log('[replaceMergeFields] Data:', data)

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
    if ((key === 'amount' || key === 'opportunity_amount' || key === 'event_total_amount') && typeof value === 'number') {
      formattedValue = `$${value.toLocaleString()}`
    } else if ((key === 'event_date' || key === 'event_start_date' || key === 'event_end_date') && value) {
      formattedValue = new Date(value).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } else if ((key === 'event_start_time' || key === 'event_end_time' || key === 'event_setup_time' || key === 'setup_time') && value) {
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

    // Replace all occurrences of {{field_name}}
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    console.log('[replaceMergeFields] Replacing', regex, 'with', formattedValue)
    result = result.replace(regex, formattedValue)
  })

  console.log('[replaceMergeFields] Result:', result)
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
}): Promise<MergeFieldData> {
  const data: MergeFieldData = {}

  console.log('[getMergeFieldData] Params:', params)

  try {
    // Fetch event data
    if (params.eventId) {
      const response = await fetch(`/api/events/${params.eventId}`)
      console.log('[getMergeFieldData] Event response:', response.ok)
      if (response.ok) {
        const event = await response.json()
        console.log('[getMergeFieldData] Event data:', event)

        // Event basic info
        data.event_title = event.title
        data.event_load_in_notes = event.load_in_notes
        data.event_setup_time = event.setup_time
        
        // Legacy fields
        data.load_in_notes = event.load_in_notes
        data.setup_time = event.setup_time

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

          // Event location from first event date
          if (firstDate.locations) {
            data.event_location = firstDate.locations.name
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
          
          // Legacy field
          data.company_name = event.accounts.name
        }

        // Try to fetch total amount from invoices
        try {
          const invoicesResponse = await fetch(`/api/invoices?event_id=${params.eventId}`)
          if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json()
            if (invoices && invoices.length > 0) {
              const total = invoices.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
              data.event_total_amount = total
            }
          }
        } catch (err) {
          console.error('Error fetching event invoices for total:', err)
          data.event_total_amount = null
        }
      }
    }

    // Fetch opportunity data
    if (params.opportunityId) {
      const response = await fetch(`/api/opportunities/${params.opportunityId}`)
      console.log('[getMergeFieldData] Opportunity response:', response.ok)
      if (response.ok) {
        const opportunity = await response.json()
        console.log('[getMergeFieldData] Opportunity data:', opportunity)
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
      console.log('[getMergeFieldData] Account response:', response.ok)
      if (response.ok) {
        const account = await response.json()
        console.log('[getMergeFieldData] Account data:', account)
        data.account_name = account.name
        
        // Legacy field
        data.company_name = account.name
      }
    }

    // Fetch contact data
    if (params.contactId) {
      const response = await fetch(`/api/contacts/${params.contactId}`)
      console.log('[getMergeFieldData] Contact response:', response.ok)
      if (response.ok) {
        const contact = await response.json()
        console.log('[getMergeFieldData] Contact data:', contact)
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
      console.log('[getMergeFieldData] Lead response:', response.ok)
      if (response.ok) {
        const lead = await response.json()
        console.log('[getMergeFieldData] Lead data:', lead)
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
  } catch (error) {
    console.error('Error fetching merge field data:', error)
  }

  console.log('[getMergeFieldData] Final data:', data)
  return data
}
