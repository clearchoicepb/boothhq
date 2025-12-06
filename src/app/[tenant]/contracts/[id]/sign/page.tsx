'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SignatureCapture } from '@/components/contracts/SignatureCapture'
import { CheckCircle, FileText, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('sign')

interface Contract {
  id: string
  title: string
  content: string
  signer_name: string | null
  signer_email: string | null
  status: string
  signed_at: string | null
  logoUrl?: string | null
}

export default function ContractSignPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchContract()
  }, [])

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${params.id}`)
      if (!response.ok) {
        throw new Error('Contract not found')
      }
      const data = await response.json()
      setContract(data)
      
      // Mark as viewed
      if (data.status === 'sent') {
        await fetch(`/api/contracts/${params.id}/viewed`, { method: 'POST' })
      }
    } catch (error) {
      log.error({ error }, 'Error fetching contract')
      setError('Contract not found or has expired')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (signature: string) => {
    setSigning(true)
    try {
      const response = await fetch(`/api/contracts/${params.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sign contract')
      }

      const result = await response.json()
      toast.success('Agreement signed successfully!')
      
      // Refresh contract data
      await fetchContract()
      setShowSignature(false)
    } catch (error: any) {
      log.error({ error }, 'Error signing contract')
      toast.error(error.message || 'Failed to sign agreement')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
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

  // Already signed
  if (contract.status === 'signed' && contract.signed_at) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Agreement Already Signed
          </h2>
          <p className="text-gray-600 mb-4">
            This agreement was signed on{' '}
            {new Date(contract.signed_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className="text-sm text-gray-500">
            Thank you for your submission.
          </p>
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
            {contract.title}
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
          
          {/* Contract Content with improved styling */}
          <div 
            className="prose prose-sm max-w-none prose-p:mb-4 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-4 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: contract.content }}
          />
        </div>

        {/* Signature Section */}
        {showSignature ? (
          <SignatureCapture
            onSign={handleSign}
            onCancel={() => setShowSignature(false)}
            signerName={contract.signer_name || ''}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

