'use client'

import { LineItemsManager } from '@/components/shared/line-items-manager'
import { InvoiceDetails } from './InvoiceDetails'
import { InvoiceQuickActions } from './InvoiceQuickActions'
import { InvoiceTotals } from './InvoiceTotals'
import { InvoiceNotesTerms } from './InvoiceNotesTerms'
import type { Invoice } from './types'

interface InvoiceExpandedContentProps {
  invoice: Invoice
  tenantSubdomain: string
  canEdit: boolean
  // Editing state
  editingField: string | null
  savingField: string | null
  // Quick action state
  activatingInvoiceId: string | null
  linkCopiedInvoiceId: string | null
  // Handlers
  onStartEdit: (field: string) => void
  onSaveField: (invoiceId: string, field: string, value: string) => void
  onCancelEdit: () => void
  onActivate: (invoiceId: string) => void
  onOpenPaymentModal: (invoice: Invoice) => void
  onCopyPublicLink: (invoice: Invoice) => void
  onDownloadPDF: (invoice: Invoice) => void
  onRefresh: () => void
}

/**
 * Expanded content section for an invoice containing:
 * - Invoice details (issue date, tax rate, PO)
 * - Quick action buttons
 * - Line items manager
 * - Invoice totals
 * - Notes and terms
 */
export function InvoiceExpandedContent({
  invoice,
  tenantSubdomain,
  canEdit,
  editingField,
  savingField,
  activatingInvoiceId,
  linkCopiedInvoiceId,
  onStartEdit,
  onSaveField,
  onCancelEdit,
  onActivate,
  onOpenPaymentModal,
  onCopyPublicLink,
  onDownloadPDF,
  onRefresh
}: InvoiceExpandedContentProps) {
  return (
    <div className="border-t p-6 bg-gray-50">
      <InvoiceDetails
        invoice={invoice}
        editingField={editingField}
        savingField={savingField}
        canEdit={canEdit}
        onStartEdit={onStartEdit}
        onSaveField={onSaveField}
        onCancelEdit={onCancelEdit}
      />

      <InvoiceQuickActions
        invoice={invoice}
        tenantSubdomain={tenantSubdomain}
        activatingInvoiceId={activatingInvoiceId}
        linkCopiedInvoiceId={linkCopiedInvoiceId}
        onActivate={onActivate}
        onOpenPaymentModal={onOpenPaymentModal}
        onCopyPublicLink={onCopyPublicLink}
        onDownloadPDF={onDownloadPDF}
      />

      {/* Line Items Manager */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Line Items</h3>
        <LineItemsManager
          key={`invoice-${invoice.id}`}
          parentType="invoice"
          parentId={invoice.id}
          editable={canEdit}
          onUpdate={onRefresh}
        />
      </div>

      <InvoiceTotals invoice={invoice} />
      <InvoiceNotesTerms invoice={invoice} />
    </div>
  )
}
