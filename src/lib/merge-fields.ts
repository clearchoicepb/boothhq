/**
 * Replaces merge fields in templates with actual data
 * Merge fields format: {{field_name}}
 */

interface MergeFieldData {
  // Contact/Lead data
  first_name?: string
  last_name?: string
  email?: string
  phone?: string

  // Account data
  company_name?: string

  // Opportunity data
  opportunity_name?: string
  amount?: number
  event_date?: string

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
    if (key === 'amount' && typeof value === 'number') {
      formattedValue = `$${value.toLocaleString()}`
    } else if (key === 'event_date' && value) {
      formattedValue = new Date(value).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
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
}): Promise<MergeFieldData> {
  const data: MergeFieldData = {}

  console.log('[getMergeFieldData] Params:', params)

  try {
    // Fetch opportunity data
    if (params.opportunityId) {
      const response = await fetch(`/api/opportunities/${params.opportunityId}`)
      console.log('[getMergeFieldData] Opportunity response:', response.ok)
      if (response.ok) {
        const opportunity = await response.json()
        console.log('[getMergeFieldData] Opportunity data:', opportunity)
        data.opportunity_name = opportunity.name
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
