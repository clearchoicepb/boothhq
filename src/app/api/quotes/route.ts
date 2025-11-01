import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const opportunityId = searchParams.get('opportunity_id')

    let query = supabase
      .from('quotes')
      .select(`
        *,
        accounts!quotes_account_id_fkey(name),
        contacts!quotes_contact_id_fkey(first_name, last_name),
        opportunities!quotes_opportunity_id_fkey(name)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching quotes:', error)
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
    }

    // Transform the data to include related names
    const transformedData = data?.map(quote => ({
      ...quote,
      account_name: quote.accounts?.name || null,
      contact_name: quote.contacts ? `${quote.contacts.first_name} ${quote.contacts.last_name}` : null,
      opportunity_name: quote.opportunities?.name || null
    })) || []

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    // Generate quote number if not provided
    if (!body.quote_number) {
      const { data: lastQuote } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('tenant_id', dataSourceTenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const lastNumber = lastQuote?.quote_number ? parseInt(lastQuote.quote_number.replace('QT-', '')) : 0
      body.quote_number = `QT-${String(lastNumber + 1).padStart(4, '0')}`
    }

    // If opportunity_id is provided, fetch opportunity line items
    let lineItems = body.line_items || []

    if (body.opportunity_id && !lineItems.length) {
      const { data: opportunityLineItems } = await supabase
        .from('opportunity_line_items')
        .select('*')
        .eq('opportunity_id', body.opportunity_id)
        .order('sort_order', { ascending: true })

      if (opportunityLineItems && opportunityLineItems.length > 0) {
        lineItems = opportunityLineItems.map(item => ({
          item_type: item.item_type,
          package_id: item.package_id,
          add_on_id: item.add_on_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          sort_order: item.sort_order
        }))
      }
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (parseFloat(item.total) || 0), 0)
    const taxAmount = subtotal * (parseFloat(body.tax_rate) || 0)
    const totalAmount = subtotal + taxAmount

    const quoteData = {
      tenant_id: dataSourceTenantId,
      opportunity_id: body.opportunity_id,
      account_id: body.account_id,
      contact_id: body.contact_id || null,
      quote_number: body.quote_number,
      title: body.title || null,
      issue_date: body.issue_date || new Date().toISOString().split('T')[0],
      valid_until: body.valid_until || null,
      subtotal,
      tax_rate: parseFloat(body.tax_rate) || 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: body.status || 'draft',
      notes: body.notes || null,
      terms: body.terms || null
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert(quoteData)
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
    }

    // Insert line items if provided
    if (lineItems.length > 0) {
      const lineItemsData = lineItems.map((item: any) => ({
        tenant_id: dataSourceTenantId,
        quote_id: quote.id,
        item_type: item.item_type,
        package_id: item.package_id || null,
        add_on_id: item.add_on_id || null,
        name: item.name,
        description: item.description || null,
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total: parseFloat(item.total),
        sort_order: item.sort_order || 0
      }))

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsData)

      if (lineItemsError) {
        console.error('Error creating quote line items:', lineItemsError)
        // Don't fail the entire request, just log the error
      }
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
