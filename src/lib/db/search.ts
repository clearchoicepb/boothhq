import { supabase } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('db')

export interface SearchResult {
  id: string
  title: string
  type: 'lead' | 'contact' | 'account' | 'opportunity' | 'event' | 'invoice'
  subtitle?: string
  metadata?: string
}

export const searchApi = {
  /**
   * Global search across all entities
   * @param query - Search query string
   * @returns Promise with search results grouped by type
   */
  async globalSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return {
        leads: [],
        contacts: [],
        accounts: [],
        opportunities: [],
        events: [],
        invoices: []
      }
    }

    const searchTerm = `%${query.trim()}%`

    try {
      // Search all entities in parallel
      const [
        leadsResult,
        contactsResult,
        accountsResult,
        opportunitiesResult,
        eventsResult,
        invoicesResult
      ] = await Promise.all([
        // Search leads
        supabase
          .from('leads')
          .select('id, first_name, last_name, email, company, phone')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`)
          .limit(10),

        // Search contacts
        supabase
          .from('contacts')
          .select(`
            id,
            first_name,
            last_name,
            email,
            job_title,
            accounts (
              id,
              name
            )
          `)
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},job_title.ilike.${searchTerm}`)
          .limit(10),

        // Search accounts
        supabase
          .from('accounts')
          .select('id, name, email, account_type, industry')
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},industry.ilike.${searchTerm}`)
          .limit(10),

        // Search opportunities
        supabase
          .from('opportunities')
          .select(`
            id,
            name,
            stage,
            value,
            accounts (
              id,
              name
            )
          `)
          .ilike('name', searchTerm)
          .limit(10),

        // Search events
        supabase
          .from('events')
          .select('id, name, event_type, event_date, status')
          .ilike('name', searchTerm)
          .limit(10),

        // Search invoices
        supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            status,
            accounts (
              id,
              name
            )
          `)
          .ilike('invoice_number', searchTerm)
          .limit(10)
      ])

      return {
        leads: leadsResult.data || [],
        contacts: contactsResult.data || [],
        accounts: accountsResult.data || [],
        opportunities: opportunitiesResult.data || [],
        events: eventsResult.data || [],
        invoices: invoicesResult.data || []
      }
    } catch (error) {
      log.error({ error }, 'Global search error')
      throw error
    }
  },

  /**
   * Format search results for display
   */
  formatResults(results: any): SearchResult[] {
    const formatted: SearchResult[] = []

    // Format leads
    results.leads?.forEach((lead: any) => {
      formatted.push({
        id: lead.id,
        title: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        type: 'lead',
        subtitle: lead.company || lead.email || undefined,
        metadata: lead.phone
      })
    })

    // Format contacts
    results.contacts?.forEach((contact: any) => {
      formatted.push({
        id: contact.id,
        title: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        type: 'contact',
        subtitle: contact.accounts?.name || contact.email || undefined,
        metadata: contact.job_title
      })
    })

    // Format accounts
    results.accounts?.forEach((account: any) => {
      formatted.push({
        id: account.id,
        title: account.name,
        type: 'account',
        subtitle: account.email || undefined,
        metadata: account.industry || account.account_type
      })
    })

    // Format opportunities
    results.opportunities?.forEach((opp: any) => {
      formatted.push({
        id: opp.id,
        title: opp.name,
        type: 'opportunity',
        subtitle: opp.accounts?.name || undefined,
        metadata: `${opp.stage}${opp.value ? ` • $${opp.value.toLocaleString()}` : ''}`
      })
    })

    // Format events
    results.events?.forEach((event: any) => {
      formatted.push({
        id: event.id,
        title: event.name,
        type: 'event',
        subtitle: new Date(event.event_date).toLocaleDateString(),
        metadata: event.event_type || ''
      })
    })

    // Format invoices
    results.invoices?.forEach((invoice: any) => {
      formatted.push({
        id: invoice.id,
        title: `Invoice #${invoice.invoice_number}`,
        type: 'invoice',
        subtitle: invoice.accounts?.name || undefined,
        metadata: `${invoice.status} • $${invoice.total_amount?.toLocaleString() || '0'}`
      })
    })

    return formatted
  }
}
