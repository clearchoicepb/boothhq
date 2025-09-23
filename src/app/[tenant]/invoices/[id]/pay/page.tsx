'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Check } from 'lucide-react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Invoice {
  id: string
  invoice_number: string
  balance_amount: number
  total_amount: number
  account_name: string | null
}

interface PaymentFormProps {
  invoice: Invoice
  clientSecret: string
  onSuccess: () => void
}

function PaymentForm({ invoice, clientSecret, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
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
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
        return_url: `${window.location.origin}/clearchoice/invoices/${invoice.id}/pay/return`,
      })

      if (error) {
        setError(error.message || 'Payment failed')
      } else if (paymentIntent.status === 'succeeded') {
        setSucceeded(true)
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else if (paymentIntent.status === 'requires_action') {
        // Handle 3D Secure or other authentication requirements
        // The user will be redirected to complete authentication
        // and then returned to the return_url
        setError('Payment requires additional authentication. Please complete the process.')
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
              {formatCurrency(invoice.balance_amount)}
            </span>
          </div>
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
              Pay {formatCurrency(invoice.balance_amount)}
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
  const [clientSecret, setClientSecret] = useState<string | null>(null)
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
      setClientSecret(data.client_secret)
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

  if (!invoice || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
          <p className="text-gray-600">The invoice you're looking for doesn't exist.</p>
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
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        </div>
      </div>
    </div>
  )
}
