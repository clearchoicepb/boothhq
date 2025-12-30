'use client'

import { DollarSign, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoicePaymentForm } from '@/components/forms/InvoicePaymentForm'
import { useAccountInvoices } from '@/hooks/useAccountInvoices'

import {
  InvoiceHeader,
  InvoiceExpandedContent,
  CreateInvoiceModal,
} from '@/components/events/invoices'

import { useAccountInvoiceHandlers } from './invoices/useAccountInvoiceHandlers'

interface AccountInvoicesProps {
  accountId: string
  tenantSubdomain: string
  canCreate?: boolean
  canEdit?: boolean
}

/**
 * Full invoice management component for the Account detail page.
 * Displays all invoices (both event-linked and general) for the account
 * with ability to create general invoices, manage line items, and record payments.
 */
export function AccountInvoices({
  accountId,
  tenantSubdomain,
  canCreate = true,
  canEdit = true,
}: AccountInvoicesProps) {
  const { data: invoices = [], isLoading, refetch } = useAccountInvoices(accountId, 'all')

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
  } = useAccountInvoiceHandlers({ accountId, onRefresh: refetch })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Invoices</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
            <p className="text-sm text-gray-500">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} for this account
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={() => setIsCreatingInvoice(true)}
              size="sm"
              className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create General Invoice
            </Button>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create a general invoice for this account or invoices will appear here when created from events.
            </p>
            {canCreate && (
              <div className="mt-6">
                <Button
                  onClick={() => setIsCreatingInvoice(true)}
                  className="bg-[#347dc4] hover:bg-[#2c6aa3]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create General Invoice
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg">
                <InvoiceHeader
                  invoice={invoice}
                  isExpanded={expandedInvoiceId === invoice.id}
                  tenantSubdomain={tenantSubdomain}
                  canEdit={canEdit}
                  showInvoiceType={true}
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
                    onRefresh={refetch}
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
