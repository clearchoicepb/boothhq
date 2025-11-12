'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CreditCard, Building2, Mail, Phone, Calendar, Hash, AlertCircle } from 'lucide-react'
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
}

export default function PublicInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchInvoice()
    }
  }, [token])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/invoices/${token}`)

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
      case 'paid':
        return 'bg-green-500'
      case 'sent':
        return 'bg-blue-500'
      case 'overdue':
        return 'bg-red-500'
      case 'draft':
        return 'bg-gray-500'
      case 'cancelled':
        return 'bg-gray-400'
      default:
        return 'bg-gray-500'
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
    router.push(`/invoices/public/${token}/pay`)
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
  const canPay = invoice.status !== 'paid' && invoice.status !== 'cancelled' && balanceAmount > 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{tenant.name}</h1>
          <p className="text-gray-600">Invoice #{invoice.invoice_number}</p>
        </div>

        {/* Main Invoice Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">Invoice Details</CardTitle>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription>
                  View and pay your invoice
                </CardDescription>
              </div>
              {canPay && (
                <Button
                  onClick={handlePayNow}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay Now - {formatCurrency(balanceAmount)}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invoice Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{invoice.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="font-semibold">{formatDate(invoice.issue_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-semibold">{formatDate(invoice.due_date)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Bill To Section */}
            {(invoice.accounts || invoice.contacts) && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Bill To
                  </h3>
                  <div className="space-y-2 text-sm">
                    {invoice.accounts && (
                      <>
                        <p className="font-semibold">{invoice.accounts.name}</p>
                        {invoice.accounts.email && (
                          <p className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            {invoice.accounts.email}
                          </p>
                        )}
                        {invoice.accounts.phone && (
                          <p className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            {invoice.accounts.phone}
                          </p>
                        )}
                      </>
                    )}
                    {invoice.contacts && !invoice.accounts && (
                      <>
                        <p className="font-semibold">
                          {invoice.contacts.first_name} {invoice.contacts.last_name}
                        </p>
                        {invoice.contacts.email && (
                          <p className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            {invoice.contacts.email}
                          </p>
                        )}
                        {invoice.contacts.phone && (
                          <p className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            {invoice.contacts.phone}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Line Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-600">
                      <th className="pb-2 font-semibold">Description</th>
                      <th className="pb-2 font-semibold text-center">Qty</th>
                      <th className="pb-2 font-semibold text-right">Price</th>
                      <th className="pb-2 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 text-right font-semibold">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold">{formatCurrency(invoice.total_amount)}</span>
              </div>

              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid Amount</span>
                    <span className="font-semibold">-{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-blue-600">
                    <span>Balance Due</span>
                    <span>{formatCurrency(balanceAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-gray-600">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </>
            )}

            {/* Payment CTA for mobile */}
            {canPay && (
              <div className="sm:hidden">
                <Button
                  onClick={handlePayNow}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay Now - {formatCurrency(balanceAmount)}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>If you have any questions about this invoice, please contact {tenant.name}.</p>
        </div>
      </div>
    </div>
  )
}
