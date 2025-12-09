import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')

/**
 * POST /api/invoices/recalculate-balances
 * Recalculates balance_amount for all invoices in the tenant
 * This fixes any invoices where balance_amount is incorrect due to previous bugs
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    log.debug({ dataSourceTenantId }, 'Starting recalculation for tenant')

    // Get all invoices for the tenant
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, total_amount, paid_amount, balance_amount')
      .eq('tenant_id', dataSourceTenantId)

    if (fetchError) {
      log.error({ fetchError }, '[Recalculate Balances] Error fetching invoices')
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        message: 'No invoices found',
        updated: 0
      })
    }

    log.debug({ count: invoices.length }, 'Found invoices')

    // Recalculate balance for each invoice
    let updatedCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (const invoice of invoices) {
      const paidAmount = invoice.paid_amount || 0
      const correctBalance = invoice.total_amount - paidAmount

      // Determine correct status based on balance
      let correctStatus = 'no_payments_received'
      if (correctBalance <= 0) {
        correctStatus = 'paid_in_full'
      } else if (paidAmount > 0 && correctBalance > 0) {
        correctStatus = 'partially_paid'
      }

      // Get current status
      const { data: currentInvoice } = await supabase
        .from('invoices')
        .select('status')
        .eq('id', invoice.id)
        .eq('tenant_id', dataSourceTenantId)
        .single()

      const needsUpdate = invoice.balance_amount !== correctBalance ||
                         (currentInvoice?.status !== correctStatus &&
                          currentInvoice?.status !== 'draft' &&
                          currentInvoice?.status !== 'cancelled')

      // Only update if balance or status is incorrect
      if (needsUpdate) {
        log.debug({ invoiceId: invoice.id, oldBalance: invoice.balance_amount, correctBalance, oldStatus: currentInvoice?.status, correctStatus }, 'Fixing invoice balance')

        const updateData: any = {
          balance_amount: correctBalance,
          updated_at: new Date().toISOString()
        }

        // Don't change status if invoice is draft or cancelled
        if (currentInvoice?.status !== 'draft' && currentInvoice?.status !== 'cancelled') {
          updateData.status = correctStatus
        }

        const { error: updateError } = await supabase
          .from('invoices')
          .update(updateData)
          .eq('id', invoice.id)
          .eq('tenant_id', dataSourceTenantId)

        if (updateError) {
          log.error({ updateError }, '[Recalculate Balances] Error updating invoice ${invoice.id}')
          errorCount++
          errors.push({ invoiceId: invoice.id, error: updateError.message })
        } else {
          updatedCount++
        }
      }
    }

    log.debug({ updatedCount, errorCount }, 'Complete')

    return NextResponse.json({
      message: 'Balance recalculation complete',
      total: invoices.length,
      updated: updatedCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    log.error({ error }, '[Recalculate Balances] Unexpected error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
