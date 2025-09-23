import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    let query = supabase
      .from('invoices')
      .select(`
        *,
        accounts!invoices_account_id_fkey(name),
        contacts!invoices_contact_id_fkey(first_name, last_name),
        events!invoices_event_id_fkey(event_type)
      `)
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Transform the data to include account_name, contact_name, and event_name
    const transformedData = data?.map(invoice => ({
      ...invoice,
      account_name: invoice.accounts?.name || null,
      contact_name: invoice.contacts ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}` : null,
      event_name: invoice.events?.event_type || null
    })) || []

    const response = NextResponse.json(transformedData)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Generate invoice number if not provided
    if (!body.invoice_number) {
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('tenant_id', session.user.tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastInvoice?.invoice_number ? parseInt(lastInvoice.invoice_number.replace('INV-', '')) : 0
      body.invoice_number = `INV-${String(lastNumber + 1).padStart(4, '0')}`
    }

    // Calculate totals
    const subtotal = body.line_items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0
    const taxAmount = subtotal * (body.tax_rate || 0)
    const totalAmount = subtotal + taxAmount
    const balanceAmount = totalAmount - (body.paid_amount || 0)

    const invoiceData = {
      ...body,
      tenant_id: session.user.tenantId,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_amount: balanceAmount,
      status: body.status || 'sent' // Default to 'sent' (live) instead of 'draft'
    }

    // Remove line_items from the main invoice data
    const { line_items, ...invoiceInsert } = invoiceData

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceInsert)
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Insert line items if provided
    if (line_items && line_items.length > 0) {
      const lineItemsData = line_items.map((item: any) => ({
        ...item,
        tenant_id: session.user.tenantId,
        invoice_id: invoice.id
      }))

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData)

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError)
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
