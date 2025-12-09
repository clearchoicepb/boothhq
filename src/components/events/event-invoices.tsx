'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { DollarSign, Plus, ExternalLink, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LineItemsManager } from '@/components/shared/line-items-manager'
import { EmptyState } from './detail/shared/EmptyState'
import { SkeletonTable } from './detail/shared/SkeletonLoader'
import { InvoicePaymentForm } from '@/components/forms/InvoicePaymentForm'
import { useSession } from 'next-auth/react'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

import {
  InvoiceDetails,
  InvoiceQuickActions,
  InvoiceTotals,
  InvoiceNotesTerms,
  CreateInvoiceModal,
  type Invoice,
  type NewInvoiceData
} from './invoices'

const log = createLogger('events')

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
  onRefresh
}: EventInvoicesProps) {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const invoiceIdFromUrl = searchParams?.get('invoice')
  const { data: session } = useSession()

  // UI State
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [savingField, setSavingField] = useState<string | null>(null)

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState<Invoice | null>(null)

  // Quick action state
  const [linkCopiedInvoiceId, setLinkCopiedInvoiceId] = useState<string | null>(null)
  const [activatingInvoiceId, setActivatingInvoiceId] = useState<string | null>(null)

  // Auto-expand invoice from URL parameter
  useEffect(() => {
    if (invoiceIdFromUrl && invoices.length > 0) {
      const invoiceExists = invoices.some(inv => inv.id === invoiceIdFromUrl)
      if (invoiceExists) {
        setExpandedInvoiceId(invoiceIdFromUrl)
      }
    }
  }, [invoiceIdFromUrl, invoices])

  // Query invalidation helper
  const invalidateInvoiceQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['event-invoices', eventId] })
    await queryClient.invalidateQueries({ queryKey: ['invoices'] })
  }

  // === Handlers ===

  const handleCreateInvoice = async (data: NewInvoiceData) => {
    if (!accountId) {
      toast('This event must have an account assigned before creating an invoice')
      return
    }

    try {
      setCreatingInvoice(true)

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + parseInt(data.due_days))

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          account_id: accountId,
          contact_id: contactId,
          issue_date: data.issue_date,
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: 0,
          tax_rate: parseFloat(data.tax_rate),
          tax_amount: 0,
          total_amount: 0,
          balance_amount: 0,
          status: 'draft',
          purchase_order: data.purchase_order || null,
          notes: data.notes || null,
          terms: data.terms || null,
        })
      })

      if (!response.ok) throw new Error('Failed to create invoice')

      const invoice = await response.json()
      await invalidateInvoiceQueries()
      await onRefresh()
      setIsCreatingInvoice(false)
      setExpandedInvoiceId(invoice.id)
    } catch (error) {
      log.error({ error }, 'Error creating invoice')
      toast.error('Failed to create invoice')
    } finally {
      setCreatingInvoice(false)
    }
  }

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete invoice')

      if (expandedInvoiceId === invoiceId) {
        setExpandedInvoiceId(null)
      }

      await invalidateInvoiceQueries()
      await onRefresh()
    } catch (error) {
      log.error({ error }, 'Error deleting invoice')
      toast.error('Failed to delete invoice')
    }
  }

  const handleUpdateInvoiceField = async (invoiceId: string, field: string, value: string) => {
    try {
      setSavingField(`${invoiceId}-${field}`)

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })

      if (!response.ok) throw new Error(`Failed to update invoice ${field}`)

      await invalidateInvoiceQueries()
      await onRefresh()
      setEditingField(null)
    } catch (error) {
      log.error({ error }, `Error updating invoice ${field}`)
      toast.error(`Failed to update invoice ${field}`)
    } finally {
      setSavingField(null)
    }
  }

  const handleActivateInvoice = async (invoiceId: string) => {
    if (!confirm('Activate this invoice? It will be available for payment via the public link.')) return

    try {
      setActivatingInvoiceId(invoiceId)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_payments_received' })
      })

      if (!response.ok) throw new Error('Failed to activate invoice')

      await invalidateInvoiceQueries()
      await onRefresh()
      toast.success('Invoice activated successfully!')
    } catch (error) {
      log.error({ error }, 'Error activating invoice')
      toast.error('Failed to activate invoice')
    } finally {
      setActivatingInvoiceId(null)
    }
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      log.error({ error }, 'Error downloading PDF')
      toast.error('Failed to download PDF')
    }
  }

  const handleCopyPublicLink = async (invoice: Invoice) => {
    if (!invoice.public_token) {
      toast('Public link is not available for this invoice')
      return
    }

    if (!session?.user?.tenantId) {
      toast('Tenant information is not available')
      return
    }

    try {
      const publicUrl = `${window.location.origin}/invoices/public/${session.user.tenantId}/${invoice.public_token}`
      await navigator.clipboard.writeText(publicUrl)
      setLinkCopiedInvoiceId(invoice.id)
      setTimeout(() => setLinkCopiedInvoiceId(null), 2000)
    } catch (error) {
      log.error({ error }, 'Error copying link')
      toast.error('Failed to copy link to clipboard')
    }
  }

  const handleAddPayment = async (payment: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payment,
          invoice_id: activeInvoiceForPayment?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment')
      }

      setIsPaymentModalOpen(false)
      setActiveInvoiceForPayment(null)

      await invalidateInvoiceQueries()
      await onRefresh()
      toast.success('Payment added successfully!')
    } catch (error) {
      log.error({ error }, 'Error saving payment')
      toast(error instanceof Error ? error.message : 'Failed to save payment')
    }
  }

  // === Render ===

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
      {/* Header with Create Button */}
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

        {/* Invoices List */}
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
                {/* Invoice Header (Collapsible) */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedInvoiceId(expandedInvoiceId === invoice.id ? null : invoice.id)}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {expandedInvoiceId === invoice.id ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                      <div className="text-sm text-gray-500">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
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
                            handleDeleteInvoice(invoice.id, invoice.invoice_number)
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

                {/* Expanded Invoice Details */}
                {expandedInvoiceId === invoice.id && (
                  <div className="border-t p-6 bg-gray-50">
                    <InvoiceDetails
                      invoice={invoice}
                      editingField={editingField}
                      savingField={savingField}
                      canEdit={canEdit}
                      onStartEdit={setEditingField}
                      onSaveField={handleUpdateInvoiceField}
                      onCancelEdit={() => setEditingField(null)}
                    />

                    <InvoiceQuickActions
                      invoice={invoice}
                      tenantSubdomain={tenantSubdomain}
                      activatingInvoiceId={activatingInvoiceId}
                      linkCopiedInvoiceId={linkCopiedInvoiceId}
                      onActivate={handleActivateInvoice}
                      onOpenPaymentModal={(inv) => {
                        setActiveInvoiceForPayment(inv)
                        setIsPaymentModalOpen(true)
                      }}
                      onCopyPublicLink={handleCopyPublicLink}
                      onDownloadPDF={handleDownloadPDF}
                    />

                    {/* Line Items Manager */}
                    <div className="bg-white rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Line Items</h3>
                      <LineItemsManager
                        key={`invoice-${invoice.id}-${expandedInvoiceId}`}
                        parentType="invoice"
                        parentId={invoice.id}
                        editable={canEdit}
                        onUpdate={onRefresh}
                      />
                    </div>

                    <InvoiceTotals invoice={invoice} />
                    <InvoiceNotesTerms invoice={invoice} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreatingInvoice}
        isCreating={creatingInvoice}
        onClose={() => setIsCreatingInvoice(false)}
        onCreate={handleCreateInvoice}
      />

      {/* Payment Form Modal */}
      {activeInvoiceForPayment && (
        <InvoicePaymentForm
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setActiveInvoiceForPayment(null)
          }}
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
