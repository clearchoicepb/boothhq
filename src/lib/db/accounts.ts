import { supabase } from '@/lib/supabase-client'
import type { Account, AccountInsert, AccountUpdate } from '@/lib/supabase-client'

export const accountsApi = {
  // Get all accounts
  async getAll() {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  // Get account by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new account
  async create(account: AccountInsert) {
    const { data, error } = await supabase
      .from('accounts')
      .insert(account)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update account
  async update(id: string, updates: AccountUpdate) {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete account
  async delete(id: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Search accounts
  async search(query: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .or(`name.ilike.%${query}%,industry.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name')
    
    if (error) throw error
    return data
  }
}
