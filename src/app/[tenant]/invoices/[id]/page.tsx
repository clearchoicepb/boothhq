'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, Edit, Trash2, CheckCircle, X } from 'lucide-react'

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  opportunity_id: string | null
  account_id: string | null
  contact_id: string | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  notes: string | null
  terms: string | null
  opportunity_name: string | null
  account_name: string | null
  contact_name: string | null
  line_items: InvoiceLineItem[]
  created_at: string
  updated_at: string
}

export default function InvoiceDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
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
  const [localLoading, setLocalLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

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
        body: JSON.stringify({ status: 'paid' })
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
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {invoice.status === 'draft' && (
                <Button variant="outline" onClick={handleSendInvoice} disabled={updating}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invoice
                </Button>
              )}
              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleMarkAsPaid}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              <Link href={`/${tenantSubdomain}/invoices/${invoice.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" className="text-red-600" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Invoice Preview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Invoice Header */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-gray-600">Invoice #: {invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Issue Date</p>
              <p className="font-semibold text-gray-900">{new Date(invoice.issue_date).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600 mt-2">Due Date</p>
              <p className="font-semibold text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
            <div className="text-gray-900">
              <p className="font-semibold">{invoice.account_name || invoice.contact_name || 'N/A'}</p>
              {invoice.opportunity_name && (
                <p className="text-sm text-gray-600">RE: {invoice.opportunity_name}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <table className="min-w-full">
              <thead className="border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-3 text-sm font-semibold text-gray-700">Description</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">Unit Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 text-gray-900">{item.description}</td>
                    <td className="py-3 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-900">${item.unit_price.toFixed(2)}</td>
                    <td className="py-3 text-right text-gray-900">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-900">${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                <span className="font-semibold text-gray-900">${invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-[#347dc4]">${invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="border-t pt-6">
              {invoice.notes && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

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
    </div>
  )
}
