'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle, XCircle, FileImage, Download } from 'lucide-react'

interface ProofData {
  proof: {
    id: string
    file_name: string
    file_type: string
    file_size: number
    status: 'pending' | 'approved' | 'rejected'
    uploaded_at: string
    viewed_at: string | null
    responded_at: string | null
    client_name: string | null
    client_notes: string | null
    signed_url: string
  }
  event: {
    title: string
  }
  tenant: {
    logoUrl: string | null
  }
}

/**
 * Public Design Proof Approval Page
 *
 * Accessible at /proof/[token] without authentication.
 * Allows clients to view and approve/reject design proofs.
 */
export default function PublicProofPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<ProofData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState<'approve' | 'reject' | null>(null)
  const [clientName, setClientName] = useState('')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchProof()
  }, [token])

  const fetchProof = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/design-proofs/${token}`)
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError('Design proof not found or has expired')
        } else {
          setError('Unable to load design proof')
        }
        return
      }

      setData(result)
    } catch (err) {
      setError('Unable to load design proof')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (status: 'approved' | 'rejected') => {
    if (!clientName.trim()) {
      setFormError('Please enter your name')
      return
    }

    if (status === 'rejected' && !notes.trim()) {
      setFormError('Please provide feedback for why the design is being rejected')
      return
    }

    setFormError('')
    setSubmitting(true)

    try {
      const response = await fetch(`/api/public/design-proofs/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          clientName: clientName.trim(),
          notes: notes.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit response')
      }

      // Refresh the proof data to show updated status
      await fetchProof()
      setShowForm(null)
      setClientName('')
      setNotes('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit response'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#347dc4] mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading design proof...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {error || 'Proof Not Found'}
          </h1>
          <p className="text-gray-600">
            This design proof may have been removed or the link is invalid.
            Please contact the sender for assistance.
          </p>
        </div>
      </div>
    )
  }

  const { proof, event, tenant } = data
  const isPending = proof.status === 'pending'
  const isImage = proof.file_type.startsWith('image/')

  // Already responded state
  if (!isPending) {
    return (
      <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col items-center justify-center p-4">
        {/* Logo */}
        {tenant.logoUrl && (
          <div className="mb-6">
            <img
              src={tenant.logoUrl}
              alt="Company Logo"
              className="h-12 mx-auto object-contain"
            />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          {proof.status === 'approved' ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Design Approved
              </h1>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Revision Requested
              </h1>
            </>
          )}

          <p className="text-gray-600 mb-4">
            Response submitted{proof.responded_at && ` on ${formatDate(proof.responded_at)}`}
            {proof.client_name && ` by ${proof.client_name}`}
          </p>

          {proof.client_notes && (
            <div className="bg-gray-50 rounded-lg p-4 text-left mt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Feedback:</p>
              <p className="text-gray-600 italic">&quot;{proof.client_notes}&quot;</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6">
            Thank you for your response.
          </p>
        </div>
      </div>
    )
  }

  // Pending state - show proof and action buttons
  return (
    <div className="min-h-screen min-h-dvh bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt="Company Logo"
                className="h-10 object-contain"
              />
            ) : (
              <div className="h-10" />
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">Design Proof for</p>
              <p className="font-medium text-gray-900">{event.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Proof Image/Preview */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl w-full mb-6">
          {isImage ? (
            <div className="relative">
              <img
                src={proof.signed_url}
                alt={proof.file_name}
                className="w-full h-auto max-h-[60vh] object-contain bg-gray-100"
              />
            </div>
          ) : (
            <div className="p-12 text-center bg-gray-50">
              <FileImage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">{proof.file_name}</p>
              <p className="text-sm text-gray-500 mb-4">PDF Document</p>
              <a
                href={proof.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2a6ba8] transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                View PDF
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons / Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          {showForm === null ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 text-center mb-4">
                What do you think?
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowForm('approve')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold rounded-lg transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  Approve
                </button>
                <button
                  onClick={() => setShowForm('reject')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Request Changes
                </button>
              </div>
            </>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {showForm === 'approve' ? 'Approve Design' : 'Request Changes'}
              </h2>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-lg"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {showForm === 'reject' ? (
                      <>Feedback <span className="text-red-500">*</span></>
                    ) : (
                      'Comments (optional)'
                    )}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={showForm === 'reject'
                      ? "Please describe what changes you'd like..."
                      : "Any additional comments..."
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-transparent resize-none"
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowForm(null)
                      setFormError('')
                    }}
                    className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleSubmit(showForm === 'approve' ? 'approved' : 'rejected')}
                    disabled={submitting}
                    className={`flex-1 py-3 px-6 font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                      showForm === 'approve'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      showForm === 'approve' ? 'Confirm Approval' : 'Submit Feedback'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-gray-400">
        Powered by BoothHQ
      </div>
    </div>
  )
}
