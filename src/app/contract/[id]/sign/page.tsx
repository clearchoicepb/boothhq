'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { SignatureCapture } from '@/components/contracts/SignatureCapture'
import { CheckCircle, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import { sanitizeHtml } from '@/lib/sanitize'

const log = createLogger('public-sign')

interface Contract {
  id: string
  title: string
  template_name: string
  content: string
  signer_name: string | null
  signer_email: string | null
  recipient_name: string | null
  recipient_email: string | null
  status: string
  signed_at: string | null
  signed_by: string | null
  signature_data: string | null
  logoUrl?: string | null
}

/**
 * Public Contract Signing Page
 *
 * Accessible at /contract/[id]/sign without authentication.
 * Uses public API endpoints to fetch and sign contracts.
 */
export default function PublicContractSignPage() {
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchContract()
  }, [contractId])

  const fetchContract = async () => {
    try {
      // Use public API endpoint
      const response = await fetch(`/api/public/contracts/${contractId}`)
      if (!response.ok) {
        if (response.status === 410) {
          throw new Error('This agreement has expired')
        }
        throw new Error('Agreement not found')
      }
      const data = await response.json()
      setContract(data)

      // Mark as viewed if status is 'sent'
      if (data.status === 'sent') {
        await fetch(`/api/public/contracts/${contractId}/viewed`, { method: 'POST' })
      }
    } catch (err) {
      log.error({ err }, 'Error fetching contract')
      setError(err instanceof Error ? err.message : 'Agreement not found or has expired')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (signature: string) => {
    setSigning(true)
    try {
      // Use public API endpoint
      const response = await fetch(`/api/public/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sign agreement')
      }

      toast.success('Agreement signed successfully!')

      // Refresh contract data
      await fetchContract()
      setShowSignature(false)
    } catch (err: unknown) {
      log.error({ err }, 'Error signing contract')
      const message = err instanceof Error ? err.message : 'Failed to sign agreement'
      toast.error(message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#347dc4] mx-auto mb-4" />
          <p className="text-gray-600">Loading agreement...</p>
        </div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Agreement Not Found
          </h2>
          <p className="text-gray-600">
            {error || 'This agreement does not exist or has expired.'}
          </p>
        </div>
      </div>
    )
  }

  // Already signed - show full agreement with signature
  if (contract.status === 'signed' && contract.signed_at) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Signed Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-green-800">
                Agreement Signed
              </h2>
              <p className="text-sm text-green-700">
                Signed on{' '}
                {new Date(contract.signed_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {contract.signed_by && ` by ${contract.signed_by}`}
              </p>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {contract.title || contract.template_name}
            </h1>
          </div>

          {/* Contract Content */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            {/* Company Logo */}
            {contract.logoUrl && (
              <div className="flex justify-center mb-8 pb-6 border-b border-gray-200">
                <img
                  src={contract.logoUrl}
                  alt="Company Logo"
                  className="h-20 w-auto object-contain"
                />
              </div>
            )}

            {/* Contract Content with styling */}
            <div
              className="prose prose-sm max-w-none prose-p:mb-4 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-4 prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contract.content) }}
            />
          </div>

          {/* Signature Display */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Signature
            </h3>
            <div className="border-t border-gray-200 pt-4">
              {contract.signature_data ? (
                <div className="text-center">
                  <p className="text-2xl italic font-serif text-gray-800 mb-2">
                    {contract.signature_data}
                  </p>
                  <div className="border-t border-gray-400 w-64 mx-auto"></div>
                </div>
              ) : contract.signed_by ? (
                <div className="text-center">
                  <p className="text-2xl italic font-serif text-gray-800 mb-2">
                    {contract.signed_by}
                  </p>
                  <div className="border-t border-gray-400 w-64 mx-auto"></div>
                </div>
              ) : null}
              <p className="text-sm text-gray-500 text-center mt-4">
                Signed on{' '}
                {new Date(contract.signed_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-400">
            Powered by BoothHQ
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {contract.title || contract.template_name}
          </h1>
          <p className="text-sm text-gray-600">
            Please review the agreement below and sign at the bottom.
          </p>
        </div>

        {/* Contract Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Company Logo */}
          {contract.logoUrl && (
            <div className="flex justify-center mb-8 pb-6 border-b border-gray-200">
              <img
                src={contract.logoUrl}
                alt="Company Logo"
                className="h-20 w-auto object-contain"
              />
            </div>
          )}

          {/* Contract Content with styling */}
          <div
            className="prose prose-sm max-w-none prose-p:mb-4 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-4 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(contract.content) }}
          />
        </div>

        {/* Signature Section */}
        {showSignature ? (
          <SignatureCapture
            onSign={handleSign}
            onCancel={() => setShowSignature(false)}
            signerName={contract.signer_name || contract.recipient_name || ''}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ready to Sign?
            </h3>
            <p className="text-gray-600 mb-6">
              By signing this agreement, you acknowledge that you have read,
              understood, and agree to be bound by its terms and conditions.
            </p>
            <button
              onClick={() => setShowSignature(true)}
              disabled={signing}
              className="w-full bg-[#347dc4] hover:bg-[#2a6ba8] text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? (
                <>
                  <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="inline h-5 w-5 mr-2" />
                  Continue to Signature
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
