'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  taxable?: boolean
}

interface Account {
  id: string
  name: string
  email?: string
  phone?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
}

interface Invoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  paid_amount?: number
  balance_amount?: number
  notes?: string
  line_items: InvoiceLineItem[]
  accounts?: Account
  contacts?: Contact
}

interface Tenant {
  id: string
  name: string
  subdomain: string
  logoUrl?: string
}

export default function PublicInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const token = params.token as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tenantId && token) {
      fetchInvoice()
    }
  }, [tenantId, token])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/invoices/${tenantId}/${token}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Invoice not found. Please check your link.')
        } else {
          setError('Failed to load invoice. Please try again.')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setInvoice(data.invoice)
      setTenant(data.tenant)
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError('An error occurred while loading the invoice.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'no_payments_received':
        return 'bg-yellow-500'
      case 'partially_paid':
        return 'bg-blue-500'
      case 'paid_in_full':
        return 'bg-green-500'
      case 'past_due':
        return 'bg-red-500'
      case 'draft':
        return 'bg-gray-500'
      case 'cancelled':
        return 'bg-gray-400'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'no_payments_received':
        return 'NO PAYMENTS RECEIVED'
      case 'partially_paid':
        return 'PARTIALLY PAID'
      case 'paid_in_full':
        return 'PAID IN FULL'
      case 'past_due':
        return 'PAST DUE'
      case 'draft':
        return 'DRAFT'
      case 'cancelled':
        return 'CANCELLED'
      default:
        return status.toUpperCase()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  const handlePayNow = () => {
    router.push(`/invoices/public/${tenantId}/${token}/pay`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Unable to Load Invoice</CardTitle>
            </div>
            <CardDescription>
              {error || 'The invoice you\'re looking for could not be found.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Please verify that you have the correct link or contact the sender for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const balanceAmount = invoice.balance_amount ?? invoice.total_amount
  const canPay = invoice.status !== 'paid_in_full' && invoice.status !== 'cancelled' && balanceAmount > 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Payment CTA Banner - Mobile & Desktop */}
        {canPay && (
          <div className="mb-6 bg-blue-600 text-white rounded-lg shadow-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-lg">Amount Due: {formatCurrency(balanceAmount)}</p>
              <p className="text-sm text-blue-100">Click to pay your invoice securely online</p>
            </div>
            <Button
              onClick={handlePayNow}
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Pay Now
            </Button>
          </div>
        )}

        {/* Invoice Preview */}
        <div className="bg-white rounded-lg shadow-lg p-8 sm:p-12 mb-6">
          {/* Header with Logo and Invoice Info */}
          <div className="flex justify-between items-start mb-12">
            {/* Company Logo */}
            <div>
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={`${tenant.name} Logo`}
                  className="h-16 w-auto object-contain mb-4"
                />
              ) : (
                <div className="h-16 flex items-center mb-4">
                  <h2 className="text-2xl font-bold text-[#347dc4]">{tenant.name}</h2>
                </div>
              )}
            </div>

            {/* Invoice Title and Number */}
            <div className="text-right">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-lg text-gray-600">#{invoice.invoice_number}</p>
              <Badge className={`${getStatusColor(invoice.status)} text-white mt-2`}>
                {getStatusLabel(invoice.status)}
              </Badge>
            </div>
          </div>

          {/* Billing Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 pb-8 border-b border-gray-200">
            {/* Bill To */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bill To</h3>
              <div className="text-gray-900">
                {invoice.accounts && (
                  <>
                    <p className="text-lg font-bold mb-1">{invoice.accounts.name}</p>
                    {invoice.accounts.email && (
                      <p className="text-sm text-gray-600">{invoice.accounts.email}</p>
                    )}
                    {invoice.accounts.phone && (
                      <p className="text-sm text-gray-600">{invoice.accounts.phone}</p>
                    )}
                  </>
                )}
                {invoice.contacts && !invoice.accounts && (
                  <>
                    <p className="text-lg font-bold mb-1">
                      {invoice.contacts.first_name} {invoice.contacts.last_name}
                    </p>
                    {invoice.contacts.email && (
                      <p className="text-sm text-gray-600">{invoice.contacts.email}</p>
                    )}
                    {invoice.contacts.phone && (
                      <p className="text-sm text-gray-600">{invoice.contacts.phone}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Invoice Dates */}
            <div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(invoice.issue_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</p>
                  <p className="text-base font-semibold text-gray-900">{formatDate(invoice.due_date)}</p>
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
                      <p className="font-bold text-gray-900">{item.description}</p>
                      {item.taxable === false && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                          Non-taxable
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right text-gray-900">{item.quantity}</td>
                    <td className="py-4 text-right text-gray-900">${item.unit_price.toFixed(2)}</td>
                    <td className="py-4 text-right font-semibold text-gray-900">${item.total_price.toFixed(2)}</td>
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
                  <span className="font-semibold text-gray-900 text-lg">${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Tax:</span>
                  <span className="font-semibold text-gray-900 text-lg">${invoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-4 border-t-2 border-gray-900">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">${invoice.total_amount.toFixed(2)}</span>
                </div>
                {(invoice.paid_amount || 0) > 0 && (
                  <>
                    <div className="flex justify-between py-2 border-t border-gray-300">
                      <span className="text-gray-700">Amount Paid:</span>
                      <span className="font-semibold text-green-600 text-lg">-${invoice.paid_amount?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-4 border-t-2 border-gray-900">
                      <span className="text-xl font-bold text-gray-900">Balance Due:</span>
                      <span className="text-2xl font-bold text-[#347dc4]">${balanceAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-gray-200 pt-8 mt-8">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 py-4">
          <p>If you have any questions about this invoice, please contact {tenant.name}.</p>
        </div>
      </div>
    </div>
  )
}
