import Link from 'next/link'
import { Plus, Download, Link2, Check, CreditCard, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Invoice } from './types'

interface InvoiceQuickActionsProps {
  invoice: Invoice
  tenantSubdomain: string
  activatingInvoiceId: string | null
  linkCopiedInvoiceId: string | null
  onActivate: (invoiceId: string) => void
  onOpenPaymentModal: (invoice: Invoice) => void
  onCopyPublicLink: (invoice: Invoice) => void
  onDownloadPDF: (invoice: Invoice) => void
}

/**
 * Quick action buttons for an invoice:
 * - Save & Activate (draft only)
 * - Process Payment
 * - Add Manual Payment
 * - Copy Public Link
 * - Download PDF
 */
export function InvoiceQuickActions({
  invoice,
  tenantSubdomain,
  activatingInvoiceId,
  linkCopiedInvoiceId,
  onActivate,
  onOpenPaymentModal,
  onCopyPublicLink,
  onDownloadPDF
}: InvoiceQuickActionsProps) {
  const isDraft = invoice.status === 'draft'
  const isPaidInFull = invoice.status === 'paid_in_full'
  const isCancelled = invoice.status === 'cancelled'
  const isActivating = activatingInvoiceId === invoice.id
  const linkCopied = linkCopiedInvoiceId === invoice.id

  return (
    <div className="mb-6 bg-white rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <Button
            onClick={() => onActivate(invoice.id)}
            disabled={isActivating}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isActivating ? 'Activating...' : 'Save & Activate'}
          </Button>
        )}

        {!isPaidInFull && !isDraft && (
          <Link href={`/${tenantSubdomain}/invoices/${invoice.id}/pay`}>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          </Link>
        )}

        {!isPaidInFull && !isCancelled && (
          <Button
            onClick={() => onOpenPaymentModal(invoice)}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Payment
          </Button>
        )}

        {invoice.public_token && (
          <Button
            onClick={() => onCopyPublicLink(invoice)}
            size="sm"
            variant="outline"
            className={linkCopied ? 'bg-green-50 border-green-500' : ''}
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-green-600">Link Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Copy Public Link
              </>
            )}
          </Button>
        )}

        <Button
          onClick={() => onDownloadPDF(invoice)}
          size="sm"
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  )
}
