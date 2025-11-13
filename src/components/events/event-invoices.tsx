'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { DollarSign, Plus, ExternalLink, ChevronDown, ChevronRight, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { LineItemsManager } from '@/components/shared/line-items-manager'
import { EmptyState } from './detail/shared/EmptyState'
import { SkeletonTable } from './detail/shared/SkeletonLoader'

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
  notes: string | null
  terms: string | null
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

  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [newInvoiceData, setNewInvoiceData] = useState({
    tax_rate: '0.08',
    due_days: '30',
    issue_date: new Date().toISOString().split('T')[0],
    notes: '',
    terms: ''
  })

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
      alert('This event must have an account assigned before creating an invoice')
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
      console.error('Error creating invoice:', error)
      alert('Failed to create invoice')
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
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  const toggleInvoice = (invoiceId: string) => {
    setExpandedInvoiceId(expandedInvoiceId === invoiceId ? null : invoiceId)
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
                      ${(invoice.total_amount || 0).toFixed(2)}
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
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Invoice Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Issue Date:</span>
                          <span className="ml-2 text-gray-900">{new Date(invoice.issue_date).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tax Rate:</span>
                          <span className="ml-2 text-gray-900">{((invoice.tax_rate || 0) * 100).toFixed(2)}%</span>
                        </div>
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
    </div>
  )
}
