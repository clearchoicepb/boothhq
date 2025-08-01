import { supabase } from '@/lib/supabase-client'
import type { Invoice, InvoiceInsert, InvoiceUpdate } from '@/lib/supabase-client'

export const invoicesApi = {
  // Get all invoices
  async getAll() {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        accounts (
          id,
          name
        ),
        contacts (
          id,
          first_name,
          last_name
        ),
        opportunities (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get invoice by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        accounts (
          id,
          name
        ),
        contacts (
          id,
          first_name,
          last_name
        ),
        opportunities (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Get invoices by account ID
  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contacts (
          id,
          first_name,
          last_name
        ),
        opportunities (
          id,
          name
        )
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create new invoice
  async create(invoice: InvoiceInsert) {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update invoice
  async update(id: string, updates: InvoiceUpdate) {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete invoice
  async delete(id: string) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get invoices by status
  async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        accounts (
          id,
          name
        ),
        contacts (
          id,
          first_name,
          last_name
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}
