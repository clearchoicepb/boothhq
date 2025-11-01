import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    // Execute all queries in parallel for better performance
    const [eventsResult, invoicesResult, contactsResult] = await Promise.all([
      // Get event count (total_cost column doesn't exist yet - invoicing not ready)
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', id)
        .eq('tenant_id', dataSourceTenantId),
      
      // Get upcoming invoices total
      supabase
        .from('invoices')
        .select('total_amount')
        .eq('account_id', id)
        .eq('tenant_id', dataSourceTenantId)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .eq('status', 'pending'),
      
      // Get contact count using junction table
      supabase
        .from('contact_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)
        .eq('tenant_id', dataSourceTenantId)
        .is('end_date', null) // Only active relationships
    ])

    const { count: eventsCount, error: eventsError } = eventsResult
    const { data: invoicesData, error: invoicesError } = invoicesResult
    const { count: contactCount, error: contactsError } = contactsResult

    if (eventsError) {
      console.error('Error fetching events count:', eventsError)
    }
    if (invoicesError) {
      console.error('Error fetching invoices for upcoming total:', invoicesError)
    }
    if (contactsError) {
      console.error('Error fetching contact count:', contactsError)
    }

    // Calculate totals
    const totalSpend = 0 // Will be calculated when invoicing module is ready
    const totalUpcomingInvoices = invoicesData?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0

    const summary = {
      totalSpend,
      totalUpcomingInvoices,
      contactCount: contactCount || 0,
      totalEvents: eventsCount || 0
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
