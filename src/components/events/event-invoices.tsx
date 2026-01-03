'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from './detail/shared/EmptyState'
import { SkeletonTable } from './detail/shared/SkeletonLoader'
import { InvoicePaymentForm } from '@/components/forms/InvoicePaymentForm'

import {
  InvoiceHeader,
  InvoiceExpandedContent,
  CreateInvoiceModal,
  useInvoiceHandlers,
  type Invoice
} from './invoices'

interface EventInvoicesProps {
  eventId: string
  accountId: string | null
  contactId: string | null
  invoices: Invoice[]
  loading: boolean
  tenantSubdomain: string
  canCreate: boolean
  canEdit: boolean
  onRefresh: () => void
  /** Event date for smart due date calculation (YYYY-MM-DD format) */
  eventDate?: string | null
}

export function EventInvoices({
  eventId,
  accountId,
  contactId,
  invoices,
  loading,
  tenantSubdomain,
  canCreate,
  canEdit,
  onRefresh,
  eventDate = null
}: EventInvoicesProps) {
  const searchParams = useSearchParams()
  const invoiceIdFromUrl = searchParams?.get('invoice')

  const {
    expandedInvoiceId,
    setExpandedInvoiceId,
    isCreatingInvoice,
    setIsCreatingInvoice,
    creatingInvoice,
    editingField,
    setEditingField,
    savingField,
    isPaymentModalOpen,
    activeInvoiceForPayment,
    linkCopiedInvoiceId,
    activatingInvoiceId,
    handleCreateInvoice,
    handleDeleteInvoice,
    handleUpdateInvoiceField,
    handleActivateInvoice,
    handleDownloadPDF,
    handleCopyPublicLink,
    handleAddPayment,
    openPaymentModal,
    closePaymentModal,
  } = useInvoiceHandlers({ eventId, accountId, contactId, onRefresh })

  // Auto-expand invoice from URL parameter
  useEffect(() => {
    if (invoiceIdFromUrl && invoices.length > 0) {
      const invoiceExists = invoices.some(inv => inv.id === invoiceIdFromUrl)
      if (invoiceExists) {
        setExpandedInvoiceId(invoiceIdFromUrl)
      }
    }
  }, [invoiceIdFromUrl, invoices, setExpandedInvoiceId])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Invoices</h2>
        <SkeletonTable rows={3} columns={5} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
          {canCreate && (
            <Button
              onClick={() => setIsCreatingInvoice(true)}
              size="sm"
              className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No invoices yet"
            description="Track payments and billing by creating invoices for this event."
            actionLabel={canCreate ? "Create Invoice" : undefined}
            onAction={canCreate ? () => setIsCreatingInvoice(true) : undefined}
            variant="subtle"
          />
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg">
                <InvoiceHeader
                  invoice={invoice}
                  isExpanded={expandedInvoiceId === invoice.id}
                  tenantSubdomain={tenantSubdomain}
                  canEdit={canEdit}
                  onToggleExpand={() => setExpandedInvoiceId(
                    expandedInvoiceId === invoice.id ? null : invoice.id
                  )}
                  onDelete={handleDeleteInvoice}
                />
                {expandedInvoiceId === invoice.id && (
                  <InvoiceExpandedContent
                    invoice={invoice}
                    tenantSubdomain={tenantSubdomain}
                    canEdit={canEdit}
                    editingField={editingField}
                    savingField={savingField}
                    activatingInvoiceId={activatingInvoiceId}
                    linkCopiedInvoiceId={linkCopiedInvoiceId}
                    onStartEdit={setEditingField}
                    onSaveField={handleUpdateInvoiceField}
                    onCancelEdit={() => setEditingField(null)}
                    onActivate={handleActivateInvoice}
                    onOpenPaymentModal={openPaymentModal}
                    onCopyPublicLink={handleCopyPublicLink}
                    onDownloadPDF={handleDownloadPDF}
                    onRefresh={onRefresh}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateInvoiceModal
        isOpen={isCreatingInvoice}
        isCreating={creatingInvoice}
        onClose={() => setIsCreatingInvoice(false)}
        onCreate={handleCreateInvoice}
        eventDate={eventDate}
      />

      {activeInvoiceForPayment && (
        <InvoicePaymentForm
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
          onSubmit={handleAddPayment}
          invoiceId={activeInvoiceForPayment.id}
          invoiceNumber={activeInvoiceForPayment.invoice_number}
          totalAmount={activeInvoiceForPayment.total_amount}
          remainingBalance={activeInvoiceForPayment.balance_amount}
        />
      )}
    </div>
  )
}
