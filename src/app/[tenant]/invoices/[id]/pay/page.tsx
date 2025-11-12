'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Check } from 'lucide-react'
import Link from 'next/link'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

interface Invoice {
  id: string
  invoice_number: string
  balance_amount: number
  total_amount: number
  account_name: string | null
}

interface PaymentFormProps {
  invoice: Invoice
  onSuccess: () => void
}

function PaymentForm({ invoice, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>(invoice.balance_amount.toString())

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    // Validate payment amount
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }
    if (amount > invoice.balance_amount) {
      setError(`Payment amount cannot exceed balance of ${formatCurrency(invoice.balance_amount)}`)
      return
    }

    setProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setError('Card element not found')
      setProcessing(false)
      return
    }

    try {
      // Create payment method from card
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (pmError) {
        setError(pmError.message || 'Failed to create payment method')
        setProcessing(false)
        return
      }

      // Send payment to backend with custom amount
      const response = await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: paymentMethod.id,
          amount: amount
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Payment failed')
        setProcessing(false)
        return
      }

      if (result.success && result.payment_intent?.status === 'succeeded') {
        setSucceeded(true)
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else if (result.requires_action) {
        setError('Payment requires additional authentication. Please complete the process.')
      } else {
        setError(result.error || 'Payment failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">Your payment has been processed successfully.</p>
        <p className="text-sm text-gray-500 mt-2">You will be redirected shortly...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.balance_amount}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                type="button"
                onClick={() => setPaymentAmount(invoice.balance_amount.toString())}
                className="h-full px-3 text-xs font-medium text-blue-600 hover:text-blue-700 border-l border-gray-300"
              >
                Full Balance
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Balance due: {formatCurrency(invoice.balance_amount)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="p-3 border border-gray-300 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Amount to Pay:</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(parseFloat(paymentAmount) || 0)}
            </span>
          </div>
          {parseFloat(paymentAmount) < invoice.balance_amount && (
            <p className="text-xs text-amber-600 mt-2">
              Partial payment - Remaining balance after payment: {formatCurrency(invoice.balance_amount - parseFloat(paymentAmount))}
            </p>
          )}
        </div>
      </div>

      <div className="flex space-x-4">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {formatCurrency(parseFloat(paymentAmount) || 0)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default function InvoicePaymentPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const invoiceId = params.id as string
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && tenant && invoiceId) {
      fetchPaymentData()
    }
  }, [session, tenant, invoiceId])

  const fetchPaymentData = async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/invoices/${invoiceId}/pay`)
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load payment data')
        return
      }

      const data = await response.json()
      setInvoice(data.invoice)

      // Check if invoice has a balance
      if (data.invoice.balance_amount <= 0) {
        alert('Invoice does not have a balance')
        router.push(`/${tenantSubdomain}/invoices/${invoiceId}`)
        return
      }

      // Load Stripe with tenant-specific publishable key
      if (data.publishable_key) {
        setStripePromise(loadStripe(data.publishable_key))
      } else {
        setError('Stripe is not configured for this tenant')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load payment data')
    } finally {
      setLocalLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    router.push(`/${tenantSubdomain}/invoices/${invoiceId}`)
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment form...</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href={`/${tenantSubdomain}/invoices/${invoiceId}`}>
            <Button>Back to Invoice</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!invoice || !stripePromise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {!invoice ? 'Invoice Not Found' : 'Loading Payment System...'}
          </h1>
          <p className="text-gray-600">
            {!invoice ? 'The invoice you\'re looking for doesn\'t exist.' : 'Please wait while we set up the payment form.'}
          </p>
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
              <Link href={`/${tenantSubdomain}/invoices/${invoiceId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Invoice
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pay Invoice</h1>
                <p className="text-gray-600">Invoice {invoice.invoice_number}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Invoice {invoice.invoice_number}
            </h2>
            {invoice.account_name && (
              <p className="text-gray-600">Account: {invoice.account_name}</p>
            )}
          </div>

          <Elements stripe={stripePromise}>
            <PaymentForm
              invoice={invoice}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        </div>
      </div>
    </div>
  )
}
