'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, Edit, Trash2, CheckCircle, X, CreditCard, DollarSign, Link2, Check, Plus, Pencil, FileText, Calendar } from 'lucide-react'
import { InvoicePaymentForm } from '@/components/forms/InvoicePaymentForm'
import { createLogger } from '@/lib/logger'
import { sanitizeHtml } from '@/lib/sanitize'
import toast from 'react-hot-toast'

const log = createLogger('id')

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
  reference_number: string | null
  notes: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: 'event' | 'general'
  opportunity_id: string | null
  account_id: string | null
  contact_id: string | null
  event_id: string | null
  event_date?: string | null  // From joined event data
  event?: {
    id: string
    title: string
  } | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  paid_amount: number
  balance_amount: number
  purchase_order: string | null
  notes: string | null
  terms: string | null
  opportunity_name: string | null
  account_name: string | null
  contact_name: string | null
  event_name?: string | null
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
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState('')

  const fetchInvoice = useCallback(async () => {
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
        log.error({ error }, 'Error fetching payments')
        // Don't fail if payments can't be fetched
      }
    } catch (error) {
      log.error({ error }, 'Error fetching invoice')
    } finally {
      setLocalLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    if (session && tenant && invoiceId) {
      fetchInvoice()
    }
  }, [session, tenant, invoiceId, fetchInvoice])

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
      log.error({ error }, 'Error downloading PDF')
      toast.error('Failed to download PDF')
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
      
      toast.success('Invoice sent successfully!')
      fetchInvoice()
    } catch (error) {
      log.error({ error }, 'Error sending invoice')
      toast.error('Failed to send invoice')
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

      toast.success('Invoice activated successfully!')
      fetchInvoice()
    } catch (error) {
      log.error({ error }, 'Error activating invoice')
      toast.error('Failed to activate invoice')
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
      log.error({ error }, 'Error deleting invoice')
      toast.error('Failed to delete invoice')
    }
  }

  const handleCopyPublicLink = async () => {
    if (!invoice?.public_token) {
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
      setLinkCopied(true)

      // Reset the "copied" state after 2 seconds
      setTimeout(() => {
        setLinkCopied(false)
      }, 2000)
    } catch (error) {
      log.error({ error }, 'Error copying link')
      toast.error('Failed to copy link to clipboard')
    }
  }

  const handleAddPayment = async (payment: any) => {
    try {
      setUpdating(true)

      // If editing existing payment, use PUT, otherwise POST
      const isEditing = editingPayment !== null
      const url = isEditing ? `/api/payments/${editingPayment.id}` : '/api/payments'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payment,
          invoice_id: invoiceId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} payment`)
      }

      // Close modal and refresh data
      setIsPaymentModalOpen(false)
      setEditingPayment(null)
      await fetchInvoice()

      toast.success(`Payment ${isEditing ? 'updated' : 'added'} successfully!`)
    } catch (error) {
      log.error({ error }, 'Error saving payment')
      toast(error instanceof Error ? error.message : 'Failed to save payment')
    } finally {
      setUpdating(false)
    }
  }

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    setIsPaymentModalOpen(true)
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment? This will recalculate the invoice balance.')) {
      return
    }

    try {
      setUpdating(true)
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete payment')
      }

      await fetchInvoice()
      toast.success('Payment deleted successfully!')
    } catch (error) {
      log.error({ error }, 'Error deleting payment')
      toast(error instanceof Error ? error.message : 'Failed to delete payment')
    } finally {
      setUpdating(false)
    }
  }

  const handleEditInvoiceNumber = () => {
    setNewInvoiceNumber(invoice?.invoice_number || '')
    setEditingInvoiceNumber(true)
  }

  const handleSaveInvoiceNumber = async () => {
    if (!newInvoiceNumber.trim()) {
      toast.error('Invoice number cannot be empty')
      return
    }

    try {
      setUpdating(true)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_number: newInvoiceNumber.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update invoice number')
      }

      await fetchInvoice()
      setEditingInvoiceNumber(false)
      toast.success('Invoice number updated successfully!')
    } catch (error) {
      log.error({ error }, 'Error updating invoice number')
      toast(error instanceof Error ? error.message : 'Failed to update invoice number')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelEditInvoiceNumber = () => {
    setEditingInvoiceNumber(false)
    setNewInvoiceNumber('')
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
                {editingInvoiceNumber ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newInvoiceNumber}
                      onChange={(e) => setNewInvoiceNumber(e.target.value)}
                      className="text-2xl font-bold text-gray-900 border border-gray-300 rounded px-2 py-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInvoiceNumber()
                        if (e.key === 'Escape') handleCancelEditInvoiceNumber()
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveInvoiceNumber}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditInvoiceNumber}
                      disabled={updating}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                    <button
                      onClick={handleEditInvoiceNumber}
                      className="text-gray-400 hover:text-[#347dc4] transition-colors"
                      title="Edit invoice number"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusLabel(invoice.status)}
                  </span>
                  {/* Invoice Type Badge */}
                  {(invoice.invoice_type === 'general' || !invoice.event_id) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <FileText className="h-3 w-3" />
                      General Invoice
                    </span>
                  ) : invoice.event ? (
                    <Link
                      href={`/${tenantSubdomain}/events/${invoice.event.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      <Calendar className="h-3 w-3" />
                      {invoice.event.title || invoice.event_name || 'Event'}
                    </Link>
                  ) : invoice.event_id ? (
                    <Link
                      href={`/${tenantSubdomain}/events/${invoice.event_id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      <Calendar className="h-3 w-3" />
                      Event
                    </Link>
                  ) : null}
                </div>
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
                      Process Payment
                    </Button>
                  </Link>
                  {(invoice.status === 'no_payments_received' || invoice.status === 'partially_paid' || invoice.status === 'past_due') && invoice.balance_amount > 0 && (
                    <Button
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => setIsPaymentModalOpen(true)}
                      disabled={updating}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                  )}
                </>
              )}
              {/* Edit button - routes differently based on invoice type */}
              {invoice.event_id ? (
                <Link href={`/${tenantSubdomain}/events/${invoice.event_id}?tab=financials&invoice=${invoice.id}`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit in Event
                  </Button>
                </Link>
              ) : invoice.account_id ? (
                <Link href={`/${tenantSubdomain}/accounts/${invoice.account_id}#invoices`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit in Account
                  </Button>
                </Link>
              ) : null}
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
        <div className="bg-white rounded-lg shadow-lg p-12 mb-6 relative overflow-hidden">
          {/* Paid Stamp Overlay */}
          {invoice.status === 'paid_in_full' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div
                className="text-green-600 font-bold opacity-20 select-none"
                style={{
                  fontSize: '180px',
                  transform: 'rotate(-30deg)',
                  letterSpacing: '0.1em',
                  textShadow: '0 0 20px rgba(22, 163, 74, 0.3)'
                }}
              >
                PAID
              </div>
            </div>
          )}

          {/* Header with Logo and Invoice Info */}
          <div className="flex justify-between items-start mb-12 relative z-20">
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
                  <h2 className="text-2xl font-bold text-[#347dc4]">{tenant?.name || 'Company Name'}</h2>
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
          <div className="grid grid-cols-2 gap-12 mb-12 pb-8 border-b border-gray-200 relative z-20">
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
                {invoice.event_date && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Date</p>
                    <p className="text-base font-semibold text-gray-900">{new Date(invoice.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue Date</p>
                  <p className="text-base font-semibold text-gray-900">{new Date(invoice.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</p>
                  <p className="text-base font-semibold text-gray-900">{new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {invoice.purchase_order && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purchase Order</p>
                    <p className="text-base font-semibold text-gray-900">{invoice.purchase_order}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8 relative z-20">
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
                        <div
                          className="text-xs text-gray-600 mt-1 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }}
                        />
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
          <div className="flex justify-end mb-8 relative z-20">
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
            <div className="border-t border-gray-200 pt-8 mt-8 relative z-20">
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
                  <div className="flex-1">
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
                    {payment.reference_number && (
                      <p className="text-xs text-gray-500">Ref: {payment.reference_number}</p>
                    )}
                    {payment.notes && (
                      <p className="text-xs text-gray-600 italic mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500 capitalize">{payment.payment_method.replace(/_/g, ' ')}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPayment(payment)}
                        disabled={updating}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePayment(payment.id)}
                        disabled={updating}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 text-gray-900">
                {(invoice.invoice_type === 'general' || !invoice.event_id) ? 'General Invoice' : 'Event Invoice'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 text-gray-900">{new Date(invoice.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <span className="ml-2 text-gray-900">{new Date(invoice.updated_at).toLocaleString()}</span>
            </div>
            {invoice.account_id && (
              <div>
                <span className="text-gray-500">Account:</span>
                <Link
                  href={`/${tenantSubdomain}/accounts/${invoice.account_id}`}
                  className="ml-2 text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  {invoice.account_name || 'View Account'}
                </Link>
              </div>
            )}
            {invoice.event_id && (
              <div>
                <span className="text-gray-500">Related Event:</span>
                <Link
                  href={`/${tenantSubdomain}/events/${invoice.event_id}`}
                  className="ml-2 text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  {invoice.event?.title || invoice.event_name || 'View Event'}
                </Link>
              </div>
            )}
            {invoice.opportunity_id && (
              <div>
                <span className="text-gray-500">Related Opportunity:</span>
                <Link
                  href={`/${tenantSubdomain}/opportunities/${invoice.opportunity_id}`}
                  className="ml-2 text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  {invoice.opportunity_name || 'View Opportunity'}
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
          onClose={() => {
            setIsPaymentModalOpen(false)
            setEditingPayment(null)
          }}
          onSubmit={handleAddPayment}
          invoiceId={invoiceId}
          invoiceNumber={invoice.invoice_number}
          totalAmount={invoice.total_amount}
          remainingBalance={invoice.balance_amount}
          initialData={editingPayment || undefined}
        />
      )}
    </div>
  )
}
