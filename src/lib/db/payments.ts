import { supabase } from '@/lib/supabase-client'
import type { Payment, PaymentInsert, PaymentUpdate } from '@/lib/supabase-client'

export const paymentsApi = {
  // Get all payments
  async getAll() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          total_amount,
          accounts (
            id,
            name
          )
        )
      `)
      .order('payment_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get payment by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          total_amount,
          accounts (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Get payments by invoice ID
  async getByInvoiceId(invoiceId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create new payment
  async create(payment: PaymentInsert) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update payment
  async update(id: string, updates: PaymentUpdate) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete payment
  async delete(id: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get payments by date range
  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          total_amount,
          accounts (
            id,
            name
          )
        )
      `)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false })
    
    if (error) throw error
    return data
  }
}
