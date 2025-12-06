import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTenantClient } from '@/lib/data-sources'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Create server-side client for APPLICATION DATABASE
 *
 * IMPORTANT: This connects to the APPLICATION database, which contains:
 * - tenants (tenant metadata with connection strings)
 * - users (authentication and authorization)
 * - audit_log (system-level audit trail)
 *
 * For business data (accounts, contacts, events, etc.), use getTenantDatabaseClient() instead.
 */
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

/**
 * Create server-side client for TENANT DATA DATABASE
 *
 * IMPORTANT: This connects to the tenant-specific data database, which contains:
 * - accounts, contacts, leads, opportunities
 * - events, locations, staff, equipment
 * - invoices, payments, quotes, contracts
 * - tasks, templates, attachments, communications
 *
 * This uses the DataSourceManager to:
 * 1. Fetch tenant connection config from application database
 * 2. Decrypt the connection strings
 * 3. Return a Supabase client connected to the tenant's data database
 *
 * @param tenantId - The tenant UUID (usually from session.user.tenantId)
 * @returns Supabase client connected to tenant's data database
 *
 * @example
 * ```typescript
 * const session = await getServerSession(authOptions)
 * const tenantDb = await getTenantDatabaseClient(session.user.tenantId)
 * const { data } = await tenantDb.from('accounts').select('*')
 * ```
 */
export const getTenantDatabaseClient = async (tenantId: string) => {
  return getTenantClient(tenantId, true)
}

// Type helpers
export type Account = Database['public']['Tables']['accounts']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']
export type Opportunity = Database['public']['Tables']['opportunities']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceLineItem = Database['public']['Tables']['invoice_line_items']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type Location = Database['public']['Tables']['locations']['Row']
export type EventDate = Database['public']['Tables']['event_dates']['Row']

export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceLineItemInsert = Database['public']['Tables']['invoice_line_items']['Insert']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type LocationInsert = Database['public']['Tables']['locations']['Insert']
export type EventDateInsert = Database['public']['Tables']['event_dates']['Insert']

export type AccountUpdate = Database['public']['Tables']['accounts']['Update']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type InvoiceLineItemUpdate = Database['public']['Tables']['invoice_line_items']['Update']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']
export type LocationUpdate = Database['public']['Tables']['locations']['Update']
export type EventDateUpdate = Database['public']['Tables']['event_dates']['Update']
