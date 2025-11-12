'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CreditCard, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

interface Invoice {
  id: string
  invoice_number: string
  balance_amount: number
  total_amount: number
  status: string
}

interface PaymentFormProps {
  invoice: Invoice
  tenantId: string
  token: string
  clientSecret: string
  onSuccess: () => void
}

function PaymentForm({ invoice, tenantId, token, clientSecret, onSuccess }: PaymentFormProps) {
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

    try {
      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
        setProcessing(false)
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update backend with payment confirmation
        const response = await fetch(`/api/public/invoices/${tenantId}/${token}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
          })
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Failed to update payment status')
          setProcessing(false)
          return
        }

        setSucceeded(true)
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setError('Payment was not successful. Please try again.')
        setProcessing(false)
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError('An unexpected error occurred')
      setProcessing(false)
    }
  }

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-2">Your payment has been processed successfully.</p>
        <p className="text-sm text-gray-500">You will be redirected shortly...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Pay {formatCurrency(invoice.balance_amount ?? invoice.total_amount)}
          </>
        )}
      </Button>
    </form>
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export default function PublicInvoicePaymentPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const token = params.token as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<string>('')

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
          setError('Invoice not found.')
        } else {
          setError('Failed to load invoice.')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      const invoiceData = data.invoice

      setInvoice(invoiceData)

      // Set default payment amount to balance
      const balance = invoiceData.balance_amount ?? invoiceData.total_amount
      setPaymentAmount(balance.toString())

      // Check if invoice can be paid
      if (invoiceData.status === 'paid_in_full') {
        setError('This invoice has already been paid in full.')
        setLoading(false)
        return
      }

      if (invoiceData.status === 'cancelled') {
        setError('This invoice has been cancelled.')
        setLoading(false)
        return
      }

      if (balance <= 0) {
        setError('This invoice has no remaining balance.')
        setLoading(false)
        return
      }

      // Create payment intent with default amount
      await createPaymentIntent(balance)
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError('An error occurred while loading the invoice.')
    } finally {
      setLoading(false)
    }
  }

  const createPaymentIntent = async (amount?: number) => {
    try {
      const amountToUse = amount || parseFloat(paymentAmount)

      if (!amountToUse || amountToUse <= 0) {
        setError('Please enter a valid payment amount')
        return
      }

      const response = await fetch(
        `/api/public/invoices/${tenantId}/${token}/pay?amount=${amountToUse}`
      )

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to initialize payment')
        return
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
      setPublishableKey(data.publishableKey)

      if (data.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey))
      }
    } catch (err) {
      console.error('Error creating payment intent:', err)
      setError('Failed to initialize payment')
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentAmount(e.target.value)
  }

  const handleUpdateAmount = async () => {
    const amount = parseFloat(paymentAmount)
    const balance = invoice?.balance_amount ?? invoice?.total_amount ?? 0

    if (!amount || amount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (amount > balance) {
      setError(`Payment amount cannot exceed balance of ${formatCurrency(balance)}`)
      return
    }

    setError(null)
    setClientSecret(null) // Reset payment intent
    await createPaymentIntent(amount)
  }

  const handlePaymentSuccess = () => {
    router.push(`/invoices/public/${tenantId}/${token}?paid=true`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Unable to Process Payment</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/invoices/public/${tenantId}/${token}`}>
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const balance = invoice?.balance_amount ?? invoice?.total_amount ?? 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href={`/invoices/public/${tenantId}/${token}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoice
          </Button>
        </Link>

        {/* Payment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pay Invoice</CardTitle>
            <CardDescription>
              Invoice #{invoice?.invoice_number}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Total Amount Due:</span>
                <span className="text-lg font-bold text-blue-900">
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>

            {/* Custom Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount (optional - defaults to full balance)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    value={paymentAmount}
                    onChange={handleAmountChange}
                    className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleUpdateAmount}
                  variant="outline"
                  disabled={parseFloat(paymentAmount) === balance}
                >
                  Update
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                You can pay a partial amount or the full balance
              </p>
            </div>

            {/* Payment Form */}
            {clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  invoice={invoice!}
                  tenantId={tenantId}
                  token={token}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}

            {!clientSecret && !error && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Initializing payment...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t">
              <p>🔒 Payments are securely processed by Stripe</p>
              <p className="mt-1">Your payment information is encrypted and secure</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
