import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Type helpers
export type Account = Database['public']['Tables']['accounts']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Opportunity = Database['public']['Tables']['opportunities']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']

export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']

export type AccountUpdate = Database['public']['Tables']['accounts']['Update']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type InvoiceLineItemUpdate = Database['public']['Tables']['invoice_line_items']['Update']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']
