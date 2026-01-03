import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const eventId = searchParams.get('event_id')
    const accountId = searchParams.get('account_id')
    const invoiceType = searchParams.get('invoice_type') // 'event' | 'general' | null (all)
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const showOutstanding = searchParams.get('outstanding') === 'true'
    const month = searchParams.get('month') // Format: YYYY-MM

    let query = supabase
      .from('invoices')
      .select(`
        *,
        accounts!invoices_account_id_fkey(id, name),
        contacts!invoices_contact_id_fkey(first_name, last_name),
        events!invoices_event_id_fkey(id, title, event_type)
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Filter by event_id if provided
    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    // Filter by account_id if provided
    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    // Filter by invoice_type if provided
    if (invoiceType && (invoiceType === 'event' || invoiceType === 'general')) {
      query = query.eq('invoice_type', invoiceType)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter for outstanding invoices (not paid or cancelled)
    if (showOutstanding) {
      query = query.not('status', 'in', '("paid","cancelled")')
    }

    // Filter by month (due_date in specific month)
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0) // Last day of month
      const startISO = startDate.toISOString().split('T')[0]
      const endISO = endDate.toISOString().split('T')[0]
      query = query.gte('due_date', startISO).lte('due_date', endISO + 'T23:59:59.999Z')
    }

    // Apply sorting
    const validSortFields = ['created_at', 'due_date', 'issue_date', 'total_amount', 'invoice_number']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching invoices')
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Transform the data to include account_name, contact_name, event info, and invoice_type
    const transformedData = data?.map(invoice => ({
      ...invoice,
      account_name: invoice.accounts?.name || null,
      account: invoice.accounts || null,
      contact_name: invoice.contacts ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}` : null,
      event_name: invoice.events?.title || invoice.events?.event_type || null,
      event: invoice.events || null,
      invoice_type: invoice.invoice_type || 'event' // Default to 'event' for backwards compatibility
    })) || []

    const response = NextResponse.json(transformedData)

    // Use short-lived cache to ensure fresh data after mutations
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate, max-age=0')

    return response
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Check if request has a body
    const contentLength = request.headers.get('content-length')
    if (!contentLength || contentLength === '0') {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
    }

    let body
    try {
      const text = await request.text()
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
      }
      body = JSON.parse(text)
    } catch (error) {
      log.error({ error }, 'Error parsing request body')
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // Determine invoice type (default to 'event' for backwards compatibility, or 'general' if no event_id)
    const invoiceType = body.invoice_type || (body.event_id ? 'event' : 'general')
    body.invoice_type = invoiceType

    // Generate invoice number if not provided
    if (!body.invoice_number) {
      // Get invoice settings from tenant_settings
      const { data: tenantSettings } = await supabase
        .from('tenant_settings')
        .select('settings')
        .eq('tenant_id', dataSourceTenantId)
        .single()

      // Extract invoice settings with defaults
      const invoiceSettings = tenantSettings?.settings?.invoices || {}
      const eventPrefix = invoiceSettings.invoiceNumberPrefix || 'INV'
      const suffix = invoiceSettings.invoiceNumberSuffix || ''
      const startingNumber = invoiceSettings.nextInvoiceNumber || 1

      // Get ALL invoices to find the maximum invoice number ever used
      // This ensures we NEVER reuse a deleted invoice number
      // NOTE: The sequential number is SHARED across all invoice types
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('tenant_id', dataSourceTenantId)
        .order('invoice_number', { ascending: false })

      let maxNumber = 0
      if (allInvoices && allInvoices.length > 0) {
        // Find the highest numeric invoice number across ALL invoice types
        for (const inv of allInvoices) {
          if (inv.invoice_number) {
            // Extract number from format like 'PREFIX-0001SUFFIX' or 'GEN-INV0001'
            const match = inv.invoice_number.match(/(\d+)/)
            if (match) {
              const num = parseInt(match[1])
              if (num > maxNumber) {
                maxNumber = num
              }
            }
          }
        }
      }

      // Use the maximum of: maxNumber + 1 or the configured starting number
      const nextNumber = Math.max(maxNumber + 1, startingNumber)

      // Format depends on invoice type:
      // - General invoices: GEN-INV{number} (no zero padding, no suffix)
      // - Event invoices: PREFIX-0001SUFFIX (with zero padding and optional suffix)
      if (invoiceType === 'general') {
        body.invoice_number = `GEN-INV${nextNumber}`
      } else {
        const separator = eventPrefix ? '-' : ''
        body.invoice_number = `${eventPrefix}${separator}${String(nextNumber).padStart(4, '0')}${suffix}`
      }
    }

    // Calculate totals
    const subtotal = body.line_items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0
    const taxAmount = subtotal * (body.tax_rate || 0)
    const totalAmount = subtotal + taxAmount
    const balanceAmount = totalAmount - (body.paid_amount || 0)

    const invoiceData = {
      ...body,
      tenant_id: dataSourceTenantId,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_amount: balanceAmount,
      status: body.status || 'sent', // Default to 'sent' (live) instead of 'draft'
      // Audit trail: track who created this invoice
      created_by: session.user.id,
      updated_by: session.user.id,
    }

    // Remove line_items from the main invoice data
    const { line_items, ...invoiceInsert } = invoiceData

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceInsert)
      .select()
      .single()

    if (invoiceError) {
      log.error({ invoiceError }, 'Error creating invoice')
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Insert line items if provided
    if (line_items && line_items.length > 0) {
      const lineItemsData = line_items.map((item: any) => ({
        ...item,
        tenant_id: dataSourceTenantId,
        invoice_id: invoice.id,
        // Audit trail: track who created these line items
        created_by: session.user.id,
        updated_by: session.user.id,
      }))

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData)

      if (lineItemsError) {
        log.error({ lineItemsError }, 'Error creating line items')
        // Don't fail the entire request, just log the error
      }
    }

    const response = NextResponse.json(invoice)
    // Invalidate cache after mutation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
