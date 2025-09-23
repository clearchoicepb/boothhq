'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, FileText, Download, Send, Check, DollarSign, Calendar, User, Building2, RefreshCw, Mail, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface Invoice {
  id: string
  invoice_number: string
  account_id: string | null
  contact_id: string | null
  event_id: string | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_rate: number | null
  tax_amount: number | null
  total_amount: number
  paid_amount: number | null
  balance_amount: number
  payment_terms: string | null
  notes: string | null
  account_name: string | null
  account_email: string | null
  account_phone: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  event_name: string | null
  event_date: string | null
  line_items: LineItem[]
  created_at: string
  updated_at: string
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function InvoiceDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const invoiceId = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending] = useState(false)
  const [syncing, setSyncing] = useState(false)

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
        console.error('Error fetching invoice')
        return
      }

      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.error('Error deleting invoice')
        alert('Error deleting invoice. Please try again.')
        return
      }

      // Redirect to invoices list
      router.push(`/${tenantSubdomain}/invoices`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error deleting invoice. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleSendEmail = async () => {
    try {
      setSending(true)
      
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includePDF: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Error sending email: ${errorData.error}`)
        return
      }

      const data = await response.json()
      alert('Invoice sent successfully!')
      
      // Refresh invoice data
      fetchInvoice()
    } catch (error) {
      console.error('Error:', error)
      alert('Error sending email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleSyncQuickBooks = async () => {
    try {
      setSyncing(true)
      
      const response = await fetch(`/api/invoices/${invoiceId}/sync-quickbooks`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Error syncing to QuickBooks: ${errorData.error}`)
        return
      }

      const data = await response.json()
      alert('Invoice synced to QuickBooks successfully!')
      
      // Refresh invoice data
      fetchInvoice()
    } catch (error) {
      console.error('Error:', error)
      alert('Error syncing to QuickBooks. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      
      if (!response.ok) {
        alert('Error generating PDF. Please try again.')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice?.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error:', error)
      alert('Error downloading PDF. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'paid' && status !== 'cancelled' && new Date(dueDate) < new Date()
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

  if (!session || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
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
              <Link href={`/${tenantSubdomain}/invoices`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <p className="text-gray-600">Invoice Details</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSendEmail}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSyncQuickBooks}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync QuickBooks
                  </>
                )}
              </Button>
              <Link href={`/${tenantSubdomain}/invoices/${invoice.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 hover:text-red-700"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Invoice Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h2>
                  <p className="text-gray-600">Invoice Date: {formatDate(invoice.issue_date)}</p>
                  <p className="text-gray-600">Due Date: {formatDate(invoice.due_date)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                  {isOverdue(invoice.due_date, invoice.status) && (
                    <p className="text-red-600 text-sm mt-1">Overdue</p>
                  )}
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                  <div className="text-sm text-gray-900">
                    {invoice.account_name && (
                      <div className="font-medium">{invoice.account_name}</div>
                    )}
                    {invoice.contact_name && (
                      <div>{invoice.contact_name}</div>
                    )}
                    {invoice.account_email && (
                      <div>{invoice.account_email}</div>
                    )}
                    {invoice.account_phone && (
                      <div>{invoice.account_phone}</div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">From</h3>
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{tenant?.name || 'Your Company'}</div>
                    <div>Your Company Address</div>
                    <div>City, State ZIP</div>
                    <div>Phone: (555) 123-4567</div>
                    <div>Email: billing@yourcompany.com</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.tax_rate && invoice.tax_rate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax ({(invoice.tax_rate * 100).toFixed(1)}%):</span>
                    <span className="text-sm font-medium">{formatCurrency(invoice.tax_amount || 0)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total:</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
                {invoice.paid_amount && invoice.paid_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Paid:</span>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span className={`text-sm font-medium ${invoice.balance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(invoice.balance_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Terms */}
            {invoice.payment_terms && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Terms</h3>
                <p className="text-gray-700">{invoice.payment_terms}</p>
              </div>
            )}

            {/* Related Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Related Information</h3>
              <div className="space-y-4">
                {invoice.account_name && (
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Account</p>
                      <Link 
                        href={`/${tenantSubdomain}/accounts/${invoice.account_id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {invoice.account_name}
                      </Link>
                    </div>
                  </div>
                )}
                {invoice.contact_name && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Contact</p>
                      <Link 
                        href={`/${tenantSubdomain}/contacts/${invoice.contact_id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {invoice.contact_name}
                      </Link>
                    </div>
                  </div>
                )}
                {invoice.event_name && (
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Event</p>
                      <Link 
                        href={`/${tenantSubdomain}/events/${invoice.event_id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {invoice.event_name}
                      </Link>
                      {invoice.event_date && (
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.event_date)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Actions */}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Actions</h3>
                <div className="space-y-3">
                  {invoice.balance_amount > 0 && (
                    <Link href={`/${tenantSubdomain}/invoices/${invoice.id}/pay`} className="block">
                      <Button className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay with Stripe
                      </Button>
                    </Link>
                  )}
                  <Button className="w-full">
                    <Check className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                  <Button variant="outline" className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
