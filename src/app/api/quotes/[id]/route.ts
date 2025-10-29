import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const quoteId = params.id
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        accounts!quotes_account_id_fkey(name, email, phone),
        contacts!quotes_contact_id_fkey(first_name, last_name, email, phone),
        opportunities!quotes_opportunity_id_fkey(name, stage)
      `)
      .eq('id', quoteId)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error) {
      console.error('Error fetching quote:', error)
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('tenant_id', session.user.tenantId)
      .order('sort_order', { ascending: true })

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError)
    }

    // Transform the data
    const transformedQuote = {
      ...quote,
      account_name: quote.accounts?.name || null,
      contact_name: quote.contacts ? `${quote.contacts.first_name} ${quote.contacts.last_name}` : null,
      opportunity_name: quote.opportunities?.name || null,
      line_items: lineItems || []
    }

    return NextResponse.json(transformedQuote)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const quoteId = params.id
    const body = await request.json()
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Update quote
    const updateData: any = {}

    // Only include fields that are provided
    if (body.title !== undefined) updateData.title = body.title
    if (body.status !== undefined) updateData.status = body.status
    if (body.issue_date !== undefined) updateData.issue_date = body.issue_date
    if (body.valid_until !== undefined) updateData.valid_until = body.valid_until
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.terms !== undefined) updateData.terms = body.terms
    if (body.tax_rate !== undefined) updateData.tax_rate = parseFloat(body.tax_rate)

    // Track status changes
    if (body.status === 'sent' && !body.sent_at) {
      updateData.sent_at = new Date().toISOString()
    }
    if (body.status === 'accepted' && !body.accepted_at) {
      updateData.accepted_at = new Date().toISOString()
    }
    if (body.status === 'declined' && !body.declined_at) {
      updateData.declined_at = new Date().toISOString()
    }

    // If line items are provided, update them
    if (body.line_items) {
      // Delete existing line items
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', quoteId)
        .eq('tenant_id', session.user.tenantId)

      // Insert new line items
      if (body.line_items.length > 0) {
        const lineItemsData = body.line_items.map((item: any) => ({
          tenant_id: session.user.tenantId,
          quote_id: quoteId,
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

        await supabase
          .from('quote_line_items')
          .insert(lineItemsData)
      }

      // Recalculate totals
      const subtotal = body.line_items.reduce((sum: number, item: any) => sum + (parseFloat(item.total) || 0), 0)
      const taxAmount = subtotal * (parseFloat(body.tax_rate) || 0)
      const totalAmount = subtotal + taxAmount

      updateData.subtotal = subtotal
      updateData.tax_amount = taxAmount
      updateData.total_amount = totalAmount
    }

    const { data: quote, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating quote:', error)
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const quoteId = params.id
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Delete quote (line items will be cascade deleted)
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error deleting quote:', error)
      return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
