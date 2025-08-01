import { supabase } from '@/lib/supabase-client'
import type { Opportunity, OpportunityInsert, OpportunityUpdate } from '@/lib/supabase-client'

export const opportunitiesApi = {
  // Get all opportunities
  async getAll() {
    const { data, error } = await supabase
      .from('opportunities')
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
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get opportunity by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('opportunities')
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
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Get opportunities by account ID
  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        contacts (
          id,
          first_name,
          last_name
        )
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create new opportunity
  async create(opportunity: OpportunityInsert) {
    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunity)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update opportunity
  async update(id: string, updates: OpportunityUpdate) {
    const { data, error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete opportunity
  async delete(id: string) {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get opportunities by stage
  async getByStage(stage: string) {
    const { data, error } = await supabase
      .from('opportunities')
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
      .eq('stage', stage)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}
