import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink, Trash2, Calendar, FileText } from 'lucide-react'
import type { Invoice } from './types'

interface InvoiceHeaderProps {
  invoice: Invoice
  isExpanded: boolean
  tenantSubdomain: string
  canEdit: boolean
  showInvoiceType?: boolean // Show event name or "General" badge
  onToggleExpand: () => void
  onDelete: (invoiceId: string, invoiceNumber: string) => void
}

/**
 * Collapsible header row for an invoice displaying:
 * - Expand/collapse chevron
 * - Invoice number and due date
 * - Invoice type badge (optional - for account invoices page)
 * - Status badge
 * - Balance amount
 * - External link and delete actions
 */
export function InvoiceHeader({
  invoice,
  isExpanded,
  tenantSubdomain,
  canEdit,
  showInvoiceType = false,
  onToggleExpand,
  onDelete
}: InvoiceHeaderProps) {
  const statusStyles = getStatusStyles(invoice.status)

  // Determine if this is a general or event-linked invoice
  const isGeneral = invoice.invoice_type === 'general' || !invoice.event_id
  const eventName = invoice.event?.title || null

  return (
    <div
      className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
      onClick={onToggleExpand}
    >
      <div className="flex items-center space-x-4 flex-1">
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
            {showInvoiceType && (
              isGeneral ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <FileText className="h-3 w-3" />
                  General
                </span>
              ) : eventName ? (
                <Link
                  href={`/${tenantSubdomain}/events/${invoice.event_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  <Calendar className="h-3 w-3" />
                  {eventName}
                </Link>
              ) : null
            )}
          </div>
          <div className="text-sm text-gray-500">
            Due: {new Date(invoice.due_date + 'T00:00:00').toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles}`}>
          {invoice.status}
        </span>
        <div className="font-semibold text-gray-900">
          ${(invoice.balance_amount || 0).toFixed(2)}
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href={`/${tenantSubdomain}/invoices/${invoice.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-blue-600"
            title="View full invoice page"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(invoice.id, invoice.invoice_number)
              }}
              className="text-gray-400 hover:text-red-600"
              title="Delete invoice"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function getStatusStyles(status: string): string {
  switch (status) {
    case 'paid':
    case 'paid_in_full':
      return 'bg-green-100 text-green-800'
    case 'sent':
    case 'no_payments_received':
      return 'bg-blue-100 text-blue-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
