import { supabase } from '@/lib/supabase-client'
import type { Event, EventInsert, EventUpdate } from '@/lib/supabase-client'

export const eventsApi = {
  // Get all events
  async getAll() {
    const { data, error } = await supabase
      .from('events')
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
      .order('start_date', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Get event by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('events')
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

  // Get events by account ID
  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('events')
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
      .order('start_date', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Create new event
  async create(event: EventInsert) {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update event
  async update(id: string, updates: EventUpdate) {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete event
  async delete(id: string) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get upcoming events
  async getUpcoming() {
    const { data, error } = await supabase
      .from('events')
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
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(10)
    
    if (error) throw error
    return data
  }
}
