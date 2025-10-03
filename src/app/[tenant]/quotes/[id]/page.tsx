'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Send, Edit, Trash2, CheckCircle, X } from 'lucide-react'

interface QuoteLineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
}

interface Quote {
  id: string
  quote_number: string
  opportunity_id: string | null
  account_id: string | null
  contact_id: string | null
  issue_date: string
  valid_until: string | null
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
  line_items: QuoteLineItem[]
  invoice_id: string | null
  created_at: string
  updated_at: string
}

export default function QuoteDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const quoteId = params.id as string

  // Get return URL from browser URL
  const [returnTo, setReturnTo] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setReturnTo(urlParams.get('returnTo'))
    }
  }, [])

  const [quote, setQuote] = useState<Quote | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (session && tenant && quoteId) {
      fetchQuote()
    }
  }, [session, tenant, quoteId])

  const fetchQuote = async () => {
    try {
      setLocalLoading(true)
      const response = await fetch(`/api/quotes/${quoteId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch quote')
      }

      const data = await response.json()
      setQuote(data)
    } catch (error) {
      console.error('Error fetching quote:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      window.open(`/api/quotes/${quoteId}/pdf`, '_blank')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const handleSendQuote = async () => {
    if (!confirm('Send this quote to the client?')) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to send quote')

      alert('Quote sent successfully!')
      fetchQuote()
    } catch (error) {
      console.error('Error sending quote:', error)
      alert('Failed to send quote')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkAsAccepted = async () => {
    if (!confirm('Mark this quote as accepted?')) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' })
      })

      if (!response.ok) throw new Error('Failed to update quote')

      alert('Quote marked as accepted!')
      fetchQuote()
    } catch (error) {
      console.error('Error updating quote:', error)
      alert('Failed to update quote')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete quote')

      router.push(`/${tenantSubdomain}/quotes`)
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Failed to delete quote')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'viewed':
        return 'bg-purple-100 text-purple-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'declined':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  if (!session || !tenant || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Quote Not Found</h1>
          <Link href={`/${tenantSubdomain}/quotes`}>
            <Button>Back to Quotes</Button>
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
              <Link href={returnTo ? `/${tenantSubdomain}/${returnTo}` : `/${tenantSubdomain}/quotes`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {quote.status === 'draft' && (
                <Button variant="outline" onClick={handleSendQuote} disabled={updating}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote
                </Button>
              )}
              {(quote.status === 'sent' || quote.status === 'viewed') && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleMarkAsAccepted}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Accepted
                </Button>
              )}
              {!quote.invoice_id && (
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
        {/* Converted to Invoice Notice */}
        {quote.invoice_id && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">
              This quote has been converted to an invoice.{' '}
              <Link
                href={`/${tenantSubdomain}/invoices/${quote.invoice_id}`}
                className="font-medium underline"
              >
                View Invoice
              </Link>
            </p>
          </div>
        )}

        {/* Quote Preview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Quote Header */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">QUOTE</h2>
              <p className="text-gray-600">Quote #: {quote.quote_number}</p>
              {quote.title && <p className="text-gray-600 mt-1">{quote.title}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Issue Date</p>
              <p className="font-semibold text-gray-900">{new Date(quote.issue_date).toLocaleDateString()}</p>
              {quote.valid_until && (
                <>
                  <p className="text-sm text-gray-600 mt-2">Valid Until</p>
                  <p className="font-semibold text-gray-900">{new Date(quote.valid_until).toLocaleDateString()}</p>
                </>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Quote For</h3>
            <div className="text-gray-900">
              <p className="font-semibold">{quote.account_name || quote.contact_name || 'N/A'}</p>
              {quote.opportunity_name && (
                <p className="text-sm text-gray-600">RE: {quote.opportunity_name}</p>
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
                {quote.line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3">
                      <p className="text-gray-900 font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500">{item.description}</p>
                      )}
                    </td>
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
                <span className="font-semibold text-gray-900">${quote.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tax ({(quote.tax_rate * 100).toFixed(1)}%):</span>
                <span className="font-semibold text-gray-900">${quote.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-lg font-bold text-[#347dc4]">${quote.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(quote.notes || quote.terms) && (
            <div className="border-t pt-6">
              {quote.notes && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 text-gray-900">{new Date(quote.created_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <span className="ml-2 text-gray-900">{new Date(quote.updated_at).toLocaleString()}</span>
            </div>
            {quote.opportunity_id && (
              <div>
                <span className="text-gray-500">Related Opportunity:</span>
                <Link
                  href={`/${tenantSubdomain}/opportunities/${quote.opportunity_id}`}
                  className="ml-2 text-[#347dc4] hover:text-[#2c6aa3]"
                >
                  {quote.opportunity_name}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
