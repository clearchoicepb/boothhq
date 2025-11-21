/**
 * TypeScript types for Tickets module
 * Bug reports and feature requests system
 */

export type TicketType = 'bug' | 'feature' | 'question' | 'improvement' | 'other'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'new' | 'in_progress' | 'resolved' | 'closed' | 'on_hold'

export interface Ticket {
  id: string
  tenant_id: string
  
  // Basic Info
  title: string
  description?: string
  ticket_type: TicketType
  priority: TicketPriority
  
  // Status & Assignment
  status: TicketStatus
  assigned_to?: string
  
  // Reporter Info
  reported_by: string
  
  // Optional Context
  related_entity_type?: string
  related_entity_id?: string
  page_url?: string
  browser_info?: string
  
  // Resolution
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
  
  // Metadata
  tags?: string[]
  created_at: string
  updated_at: string
  
  // Relations (populated by joins)
  assigned_to_user?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
  reported_by_user?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
  resolved_by_user?: {
    id: string
    first_name?: string
    last_name?: string
    email: string
  }
}

export interface CreateTicketInput {
  title: string
  description?: string
  ticket_type?: TicketType
  priority?: TicketPriority
  status?: TicketStatus
  assigned_to?: string
  related_entity_type?: string
  related_entity_id?: string
  page_url?: string
  browser_info?: string
  tags?: string[]
}

export interface UpdateTicketInput extends Partial<CreateTicketInput> {
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
}

// For filtering
export interface TicketFilters {
  search?: string
  status?: TicketStatus | 'all'
  ticket_type?: TicketType | 'all'
  priority?: TicketPriority | 'all'
  assigned_to?: string | 'all'
  reported_by?: string | 'all'
}

// For stats
export interface TicketStats {
  total: number
  by_status: Record<TicketStatus, number>
  by_type: Record<TicketType, number>
  by_priority: Record<TicketPriority, number>
  unassigned: number
  my_tickets: number
}

