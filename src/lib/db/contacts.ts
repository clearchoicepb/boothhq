import { supabase } from '@/lib/supabase-client'
import type { Contact, ContactInsert, ContactUpdate } from '@/lib/supabase-client'

export const contactsApi = {
  // Get all contacts
  async getAll() {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        accounts (
          id,
          name
        )
      `)
      .order('last_name')
    
    if (error) throw error
    return data
  },

  // Get contact by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        accounts (
          id,
          name
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Get contacts by account ID
  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .order('last_name')
    
    if (error) throw error
    return data
  },

  // Create new contact
  async create(contact: ContactInsert) {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update contact
  async update(id: string, updates: ContactUpdate) {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete contact
  async delete(id: string) {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Search contacts
  async search(query: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        accounts (
          id,
          name
        )
      `)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('last_name')
    
    if (error) throw error
    return data
  }
}
