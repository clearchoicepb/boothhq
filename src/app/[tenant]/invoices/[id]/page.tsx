'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, Edit, Trash2, CheckCircle, X, CreditCard, DollarSign, Link2, Check, Plus } from 'lucide-react'
import { InvoicePaymentForm } from '@/components/forms/InvoicePaymentForm'

interface InvoiceLineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
  taxable?: boolean
}

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_intent_id: string
  status: string
  processed_at: string
  created_at: string
}

interface Invoice {
  id: string
  invoice_number: string
  opportunity_id: string | null
  account_id: string | null
  contact_id: string | null
  event_id: string | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  paid_amount: number
  balance_amount: number
  notes: string | null
  terms: string | null
  opportunity_name: string | null
  account_name: string | null
  contact_name: string | null
  line_items: InvoiceLineItem[]
  public_token?: string | null
  created_at: string
  updated_at: string
}

export default function InvoiceDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { settings } = useSettings()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const invoiceId = params.id as string

  // Get return URL from browser URL
  const [returnTo, setReturnTo] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setReturnTo(urlParams.get('returnTo'))
    }
  }, [])

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  useEffect(() => {
    if (session && tenant && invoiceId) {
      fetchInvoice()
    }
  }, [session, tenant, invoiceId])

  const fetchInvoice = async () => {
    try {
      setLocalLoading(true)
      const response = await fetch(`/api/invoices/${invoiceId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch invoice')
      }

      const data = await response.json()
      setInvoice(data)

      // Fetch payments for this invoice
      try {
        const paymentsResponse = await fetch(`/api/invoices/${invoiceId}/payments`)
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          setPayments(paymentsData)
        }
      } catch (error) {
        console.error('Error fetching payments:', error)
        // Don't fail if payments can't be fetched
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice?.invoice_number || 'invoice'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const handleSendInvoice = async () => {
    if (!confirm('Send this invoice to the client?')) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to send invoice')
      
      alert('Invoice sent successfully!')
      fetchInvoice()
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Failed to send invoice')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!confirm('Mark this invoice as paid?')) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid_in_full' })
      })

      if (!response.ok) throw new Error('Failed to update invoice')

      alert('Invoice marked as paid!')
      fetchInvoice()
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert('Failed to update invoice')
    } finally {
      setUpdating(false)
    }
  }

  const handleActivateInvoice = async () => {
    if (!confirm('Activate this invoice? It will be available for payment via the public link.')) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_payments_received' })
      })

      if (!response.ok) throw new Error('Failed to activate invoice')

      alert('Invoice activated successfully!')
      fetchInvoice()
    } catch (error) {
      console.error('Error activating invoice:', error)
      alert('Failed to activate invoice')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete invoice')

      router.push(`/${tenantSubdomain}/invoices`)
    } catch (error) {
      console.error('Error deleting invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  const handleCopyPublicLink = async () => {
    if (!invoice?.public_token) {
      alert('Public link is not available for this invoice')
      return
    }

    if (!session?.user?.tenantId) {
      alert('Tenant information is not available')
      return
    }

    try {
      const publicUrl = `${window.location.origin}/invoices/public/${session.user.tenantId}/${invoice.public_token}`
      await navigator.clipboard.writeText(publicUrl)
      setLinkCopied(true)

      // Reset the "copied" state after 2 seconds
      setTimeout(() => {
        setLinkCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Error copying link:', error)
      alert('Failed to copy link to clipboard')
    }
  }

  const handleAddPayment = async (payment: any) => {
    try {
      setUpdating(true)
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payment,
          invoice_id: invoiceId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment')
      }

      // Close modal and refresh data
      setIsPaymentModalOpen(false)
      await fetchInvoice()

      alert('Payment added successfully!')
    } catch (error) {
      console.error('Error adding payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to add payment')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'no_payments_received':
        return 'bg-yellow-100 text-yellow-800'
      case 'partially_paid':
        return 'bg-blue-100 text-blue-800'
      case 'paid_in_full':
        return 'bg-green-100 text-green-800'
      case 'past_due':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'no_payments_received':
        return 'No Payments Received'
      case 'partially_paid':
        return 'Partially Paid'
      case 'paid_in_full':
        return 'Paid in Full'
      case 'past_due':
        return 'Past Due'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!session || !tenant || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
          <Link href={`/${tenantSubdomain}/invoices`}>
            <Button>Back to Invoices</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href={returnTo || `/${tenantSubdomain}/invoices`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              {invoice.public_token && (
                <Button
                  variant="outline"
                  onClick={handleCopyPublicLink}
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
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {invoice.status === 'draft' && (
                <>
                  <Button
                    onClick={handleActivateInvoice}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save & Activate
                  </Button>
                  <Button variant="outline" onClick={handleSendInvoice} disabled={updating}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                </>
              )}
              {invoice.status !== 'paid_in_full' && invoice.status !== 'draft' && (
                <>
                  <Link href={`/${tenantSubdomain}/invoices/${invoice.id}/pay`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Now
                    </Button>
                  </Link>
                  {(invoice.status === 'no_payments_received' || invoice.status === 'partially_paid' || invoice.status === 'past_due') && invoice.balance_amount > 0 && (
                    <Button
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={handleMarkAsPaid}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </>
              )}
              {invoice.status === 'draft' && invoice.event_id && (
                <Link href={`/${tenantSubdomain}/events/${invoice.event_id}?tab=financials&invoice=${invoice.id}`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
              {invoice.status === 'draft' && (
                <Button variant="outline" className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Invoice Preview */}
        <div className="bg-white rounded-lg shadow-lg p-12 mb-6">
          {/* Header with Logo and Invoice Info */}
          <div className="flex justify-between items-start mb-12">
            {/* Company Logo */}
            <div>
              {settings?.appearance?.logoUrl ? (
                <img
                  src={settings.appearance.logoUrl}
                  alt="Company Logo"
                  className="h-16 w-auto object-contain mb-4"
                />
              ) : (
                <div className="h-16 flex items-center mb-4">
                  <h2 className="text-2xl font-bold text-[#347dc4]">{tenant?.display_name || 'Company Name'}</h2>
                </div>
              )}
            </div>

            {/* Invoice Title and Number */}
            <div className="text-right">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-lg text-gray-600">#{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Billing Information */}
          <div className="grid grid-cols-2 gap-12 mb-12 pb-8 border-b border-gray-200">
            {/* Bill To */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bill To</h3>
              <div className="text-gray-900">
                <p className="text-lg font-bold mb-1">{invoice.account_name || invoice.contact_name || 'N/A'}</p>
                {invoice.contact_name && invoice.account_name && (
                  <p className="text-sm text-gray-600">Attn: {invoice.contact_name}</p>
                )}
                {invoice.opportunity_name && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">RE:</span> {invoice.opportunity_name}
                  </p>
                )}
              </div>
            </div>

            {/* Invoice Dates */}
            <div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue Date</p>
                  <p className="text-base font-semibold text-gray-900">{new Date(invoice.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</p>
                  <p className="text-base font-semibold text-gray-900">{new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="min-w-full table-fixed">
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-3 text-xs font-bold text-gray-900 uppercase tracking-wide">Item</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-900 uppercase tracking-wide">Qty</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-900 uppercase tracking-wide">Unit Price</th>
                  <th className="text-right py-3 text-xs font-bold text-gray-900 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 pr-4">
                      <p className="font-bold text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                      )}
                      {item.taxable === false && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                          Non-taxable
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-4 text-right text-gray-900">${(item.unit_price || 0).toFixed(2)}</td>
                    <td className="py-4 text-right font-semibold text-gray-900">${(item.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900 text-lg">${(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Tax ({((invoice.tax_rate || 0) * 100).toFixed(2)}%):</span>
                  <span className="font-semibold text-gray-900 text-lg">${(invoice.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-4 border-t-2 border-gray-900">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">${(invoice.total_amount || 0).toFixed(2)}</span>
                </div>
                {(invoice.paid_amount > 0 || invoice.balance_amount !== invoice.total_amount) && (
                  <>
                    <div className="flex justify-between py-2 border-t border-gray-300">
                      <span className="text-gray-700">Amount Paid:</span>
                      <span className="font-semibold text-green-600 text-lg">-${(invoice.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-4 border-t-2 border-gray-900">
                      <span className="text-xl font-bold text-gray-900">Balance Due:</span>
                      <span className="text-2xl font-bold text-[#347dc4]">${(invoice.balance_amount || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="border-t border-gray-200 pt-8 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {invoice.notes && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Notes</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Terms & Conditions</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              </div>
              {invoice.status !== 'paid_in_full' && invoice.status !== 'cancelled' && (
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add a Payment
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.processed_at || payment.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500 capitalize">{payment.payment_method}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t-2 border-gray-900">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Total Paid:</span>
                <span className="text-lg font-bold text-green-600">${(invoice.paid_amount || 0).toFixed(2)}</span>
              </div>
              {invoice.balance_amount > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-semibold text-gray-900">Remaining Balance:</span>
                  <span className="text-lg font-bold text-[#347dc4]">${(invoice.balance_amount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Payments Yet */}
        {payments.length === 0 && invoice.status !== 'draft' && invoice.status !== 'cancelled' && invoice.status !== 'paid_in_full' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Payment Tracking</h3>
              </div>
              <Button
                onClick={() => setIsPaymentModalOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add a Payment
              </Button>
            </div>
            <p className="text-sm text-gray-500">No payments have been recorded for this invoice yet.</p>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 text-gray-900">{new Date(invoice.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <span className="ml-2 text-gray-900">{new Date(invoice.updated_at).toLocaleString()}</span>
            </div>
            {invoice.opportunity_id && (
              <div>
                <span className="text-gray-500">Related Opportunity:</span>
                <Link
                  href={`/${tenantSubdomain}/opportunities/${invoice.opportunity_id}`}
                  className="ml-2 text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  {invoice.opportunity_name}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      {invoice && (
        <InvoicePaymentForm
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleAddPayment}
          invoiceId={invoiceId}
          invoiceNumber={invoice.invoice_number}
          totalAmount={invoice.total_amount}
          remainingBalance={invoice.balance_amount}
        />
      )}
    </div>
  )
}
