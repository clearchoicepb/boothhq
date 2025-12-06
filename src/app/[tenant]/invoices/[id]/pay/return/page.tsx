'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('return')

export default function PaymentReturnPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantSubdomain = params.tenant as string
  const invoiceId = params.id as string
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (session && tenant && invoiceId) {
      handlePaymentReturn()
    }
  }, [session, tenant, invoiceId])

  const handlePaymentReturn = async () => {
    try {
      // Get the payment intent ID from the URL parameters
      const paymentIntentId = searchParams.get('payment_intent')
      const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')
      
      if (!paymentIntentId) {
        setPaymentStatus('error')
        setErrorMessage('No payment intent found in URL')
        return
      }

      // Verify the payment status with Stripe
      const response = await fetch('/api/invoices/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          invoice_id: invoiceId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setPaymentStatus('error')
        setErrorMessage(errorData.error || 'Payment verification failed')
        return
      }

      const data = await response.json()
      
      if (data.success) {
        setPaymentStatus('success')
        // Redirect to invoice page after 3 seconds
        setTimeout(() => {
          router.push(`/${tenantSubdomain}/invoices/${invoiceId}`)
        }, 3000)
      } else {
        setPaymentStatus('error')
        setErrorMessage(data.error || 'Payment was not successful')
      }
    } catch (error) {
      log.error({ error }, 'Error verifying payment')
      setPaymentStatus('error')
      setErrorMessage('An unexpected error occurred')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying payment...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Payment Status</h1>
                <p className="text-gray-600">Invoice {invoiceId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          {paymentStatus === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying Payment...</h3>
              <p className="text-gray-600">Please wait while we confirm your payment.</p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">Your payment has been processed successfully.</p>
              <p className="text-sm text-gray-500">You will be redirected to the invoice page shortly...</p>
              <div className="mt-6">
                <Link href={`/${tenantSubdomain}/invoices/${invoiceId}`}>
                  <Button>View Invoice</Button>
                </Link>
              </div>
            </div>
          )}

          {paymentStatus === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Failed</h3>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <div className="space-x-4">
                <Link href={`/${tenantSubdomain}/invoices/${invoiceId}/pay`}>
                  <Button>Try Again</Button>
                </Link>
                <Link href={`/${tenantSubdomain}/invoices/${invoiceId}`}>
                  <Button variant="outline">Back to Invoice</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}






