import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getQuickBooksService } from '@/lib/quickbooks'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:invoices')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params

    // Get QuickBooks service
    const qbService = await getQuickBooksService(session.user.tenantId)
    
    if (!qbService) {
      return NextResponse.json({ 
        error: 'QuickBooks not configured for this tenant' 
      }, { status: 400 })
    }

    // Sync invoice to QuickBooks
    const result = await qbService.syncInvoiceToQuickBooks(id, session.user.tenantId)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to sync invoice to QuickBooks' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quickbooksId: result.quickbooksId,
      message: 'Invoice synced to QuickBooks successfully'
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






