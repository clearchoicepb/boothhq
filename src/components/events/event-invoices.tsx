'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { DollarSign, Plus, ExternalLink, ChevronDown, ChevronRight, Edit, Trash2, Eye, Download, Link2, Check, CreditCard, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { LineItemsManager } from '@/components/shared/line-items-manager'
import { EmptyState } from './detail/shared/EmptyState'
import { SkeletonTable } from './detail/shared/SkeletonLoader'
import { InlineEditField } from './detail/shared/InlineEditField'
import { InvoicePaymentForm } from '@/components/forms/InvoicePaymentForm'
import { useSession } from 'next-auth/react'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('events')

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  subtotal: number
  tax_amount: number
  tax_rate: number
  due_date: string
  issue_date: string
  purchase_order: string | null
  notes: string | null
  terms: string | null
  paid_amount: number
  balance_amount: number
  public_token?: string | null
}

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

  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [newInvoiceData, setNewInvoiceData] = useState({
    tax_rate: '0.08',
    due_days: '30',
    issue_date: new Date().toISOString().split('T')[0],
    purchase_order: '',
    notes: '',
    terms: ''
  })
  const [editingField, setEditingField] = useState<string | null>(null)
  const [savingField, setSavingField] = useState<string | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState<Invoice | null>(null)
  const [linkCopiedInvoiceId, setLinkCopiedInvoiceId] = useState<string | null>(null)
  const [activatingInvoiceId, setActivatingInvoiceId] = useState<string | null>(null)

  // Auto-expand invoice from URL parameter (for edit button routing)
  useEffect(() => {
    if (invoiceIdFromUrl && invoices.length > 0) {
      // Check if the invoice exists in the list before expanding
      const invoiceExists = invoices.some(inv => inv.id === invoiceIdFromUrl)
      if (invoiceExists) {
        setExpandedInvoiceId(invoiceIdFromUrl)
      }
    }
  }, [invoiceIdFromUrl, invoices])

  const handleCreateInvoice = async () => {
    if (!accountId) {
      toast('This event must have an account assigned before creating an invoice')
      return
    }

    try {
      setCreatingInvoice(true)

      // Calculate due date (30 days from now by default)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + parseInt(newInvoiceData.due_days))

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          account_id: accountId,
          contact_id: contactId,
          issue_date: newInvoiceData.issue_date,
          due_date: dueDate.toISOString().split('T')[0],
          subtotal: 0,
          tax_rate: parseFloat(newInvoiceData.tax_rate),
          tax_amount: 0,
          total_amount: 0,
          balance_amount: 0,
          status: 'draft',
          purchase_order: newInvoiceData.purchase_order || null,
          notes: newInvoiceData.notes || null,
          terms: newInvoiceData.terms || null,
        })
      })

      if (!response.ok) throw new Error('Failed to create invoice')

      const invoice = await response.json()

      // Invalidate all invoice-related queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ['event-invoices', eventId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })

      // Wait for refresh to complete before expanding and closing modal
      await onRefresh()
      setIsCreatingInvoice(false)
      setExpandedInvoiceId(invoice.id) // Auto-expand the new invoice
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
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete invoice')

      // Close the invoice if it's currently expanded
      if (expandedInvoiceId === invoiceId) {
        setExpandedInvoiceId(null)
      }

      // Invalidate all invoice-related queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ['event-invoices', eventId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })

      // Wait for refresh to complete
      await onRefresh()
    } catch (error) {
      log.error({ error }, 'Error deleting invoice')
      toast.error('Failed to delete invoice')
    }
  }

  const toggleInvoice = (invoiceId: string) => {
    setExpandedInvoiceId(expandedInvoiceId === invoiceId ? null : invoiceId)
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

      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: ['event-invoices', eventId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await onRefresh()

      setEditingField(null)
    } catch (error) {
      log.error({ error }, 'Error updating invoice ${field}')
      toast.error('Failed to update invoice ${field}')
    } finally {
      setSavingField(null)
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

      setTimeout(() => {
        setLinkCopiedInvoiceId(null)
      }, 2000)
    } catch (error) {
      log.error({ error }, 'Error copying link')
      toast.error('Failed to copy link to clipboard')
    }
  }

  const handleOpenPaymentModal = (invoice: Invoice) => {
    setActiveInvoiceForPayment(invoice)
    setIsPaymentModalOpen(true)
  }

  const handleAddPayment = async (payment: any) => {
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

      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: ['event-invoices', eventId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await onRefresh()

      toast.success('Payment added successfully!')
    } catch (error) {
      log.error({ error }, 'Error saving payment')
      toast(error instanceof Error ? error.message : 'Failed to save payment')
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

      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: ['event-invoices', eventId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await onRefresh()

      toast.success('Invoice activated successfully!')
    } catch (error) {
      log.error({ error }, 'Error activating invoice')
      toast.error('Failed to activate invoice')
    } finally {
      setActivatingInvoiceId(null)
    }
  }

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
                  onClick={() => toggleInvoice(invoice.id)}
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
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Invoice Details</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <InlineEditField
                          label="Issue Date"
                          value={invoice.issue_date}
                          displayValue={new Date(invoice.issue_date).toLocaleDateString()}
                          type="date"
                          isEditing={editingField === `${invoice.id}-issue_date`}
                          isLoading={savingField === `${invoice.id}-issue_date`}
                          canEdit={canEdit}
                          onStartEdit={() => setEditingField(`${invoice.id}-issue_date`)}
                          onSave={(value) => handleUpdateInvoiceField(invoice.id, 'issue_date', value)}
                          onCancel={() => setEditingField(null)}
                        />
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-gray-500">Tax Rate</label>
                          <p className="text-sm text-gray-900">{((invoice.tax_rate || 0) * 100).toFixed(2)}%</p>
                        </div>
                        <InlineEditField
                          label="Purchase Order"
                          value={invoice.purchase_order || ''}
                          type="text"
                          isEditing={editingField === `${invoice.id}-purchase_order`}
                          isLoading={savingField === `${invoice.id}-purchase_order`}
                          canEdit={canEdit}
                          onStartEdit={() => setEditingField(`${invoice.id}-purchase_order`)}
                          onSave={(value) => handleUpdateInvoiceField(invoice.id, 'purchase_order', value)}
                          onCancel={() => setEditingField(null)}
                        />
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-6 bg-white rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                      <div className="flex flex-wrap gap-2">
                        {invoice.status === 'draft' && (
                          <Button
                            onClick={() => handleActivateInvoice(invoice.id)}
                            disabled={activatingInvoiceId === invoice.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {activatingInvoiceId === invoice.id ? 'Activating...' : 'Save & Activate'}
                          </Button>
                        )}
                        {invoice.status !== 'paid_in_full' && invoice.status !== 'draft' && (
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
                        {invoice.status !== 'paid_in_full' && invoice.status !== 'cancelled' && (
                          <Button
                            onClick={() => handleOpenPaymentModal(invoice)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Manual Payment
                          </Button>
                        )}
                        {invoice.public_token && (
                          <Button
                            onClick={() => handleCopyPublicLink(invoice)}
                            size="sm"
                            variant="outline"
                            className={linkCopiedInvoiceId === invoice.id ? 'bg-green-50 border-green-500' : ''}
                          >
                            {linkCopiedInvoiceId === invoice.id ? (
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
                          onClick={() => handleDownloadPDF(invoice)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>

                    {/* Line Items Manager */}
                    <div className="bg-white rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Line Items</h3>
                      <LineItemsManager
                        key={`invoice-${invoice.id}-${expandedInvoiceId}`}
                        parentType="invoice"
                        parentId={invoice.id}
                        editable={canEdit}
                        onUpdate={async () => {
                          await onRefresh()
                        }}
                      />
                    </div>

                    {/* Totals Summary */}
                    <div className="mt-4 bg-white rounded-lg p-4">
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="text-gray-900">${(invoice.subtotal || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax ({((invoice.tax_rate || 0) * 100).toFixed(2)}%):</span>
                            <span className="text-gray-900">${(invoice.tax_amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span className="text-gray-900">Total:</span>
                            <span className="text-[#347dc4]">${(invoice.total_amount || 0).toFixed(2)}</span>
                          </div>
                          {(invoice.paid_amount > 0 || invoice.balance_amount !== invoice.total_amount) && (
                            <>
                              <div className="flex justify-between text-sm border-t pt-2 mt-2">
                                <span className="text-gray-600">Paid:</span>
                                <span className="text-green-600 font-medium">${(invoice.paid_amount || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-base font-semibold">
                                <span className="text-gray-900">Balance Due:</span>
                                <span className={invoice.balance_amount > 0 ? "text-orange-600" : "text-green-600"}>
                                  ${(invoice.balance_amount || 0).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes & Terms */}
                    {(invoice.notes || invoice.terms) && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {invoice.notes && (
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                          </div>
                        )}
                        {invoice.terms && (
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Terms</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {isCreatingInvoice && (
        <Modal
          isOpen={isCreatingInvoice}
          onClose={() => setIsCreatingInvoice(false)}
          title="Create New Invoice"
          className="sm:max-w-lg"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleCreateInvoice(); }} className="space-y-4">
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Issue Date
              </label>
              <input
                id="issue_date"
                type="date"
                value={newInvoiceData.issue_date}
                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, issue_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required
              />
            </div>

            <div>
              <label htmlFor="purchase_order" className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Order (PO) Number (Optional)
              </label>
              <input
                id="purchase_order"
                type="text"
                value={newInvoiceData.purchase_order}
                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, purchase_order: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., PO-12345"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={(parseFloat(newInvoiceData.tax_rate) * 100).toString()}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, tax_rate: (parseFloat(e.target.value) / 100).toString() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="due_days" className="block text-sm font-medium text-gray-700 mb-2">
                  Due in (days)
                </label>
                <input
                  id="due_days"
                  type="number"
                  value={newInvoiceData.due_days}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, due_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={newInvoiceData.notes}
                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-2">
                Terms (Optional)
              </label>
              <textarea
                id="terms"
                rows={3}
                value={newInvoiceData.terms}
                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, terms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., Payment due within 30 days..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatingInvoice(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#347dc4] hover:bg-[#2c6aa3]"
                disabled={creatingInvoice}
              >
                {creatingInvoice ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

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
