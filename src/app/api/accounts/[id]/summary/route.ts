import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const supabase = createServerSupabaseClient()

    // Execute all queries in parallel for better performance
    const [eventsResult, invoicesResult, contactsResult] = await Promise.all([
      // Get total spend from events
      supabase
        .from('events')
        .select('total_cost')
        .eq('account_id', id)
        .eq('tenant_id', session.user.tenantId)
        .not('total_cost', 'is', null),
      
      // Get upcoming invoices total
      supabase
        .from('invoices')
        .select('total_amount')
        .eq('account_id', id)
        .eq('tenant_id', session.user.tenantId)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .eq('status', 'pending'),
      
      // Get contact count
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', id)
        .eq('tenant_id', session.user.tenantId)
    ])

    const { data: eventsData, error: eventsError } = eventsResult
    const { data: invoicesData, error: invoicesError } = invoicesResult
    const { count: contactCount, error: contactsError } = contactsResult

    if (eventsError) {
      console.error('Error fetching events for spend calculation:', eventsError)
    }
    if (invoicesError) {
      console.error('Error fetching invoices for upcoming total:', invoicesError)
    }
    if (contactsError) {
      console.error('Error fetching contact count:', contactsError)
    }

    // Calculate totals
    const totalSpend = eventsData?.reduce((sum, event) => sum + (event.total_cost || 0), 0) || 0
    const totalUpcomingInvoices = invoicesData?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0

    const summary = {
      totalSpend,
      totalUpcomingInvoices,
      contactCount: contactCount || 0,
      totalEvents: eventsData?.length || 0
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
