'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  Clock,
  XCircle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ContractManagerModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  eventId: string
}

interface Contract {
  id: string
  template_name: string
  content: string
  status: string
  recipient_name: string | null
  recipient_email: string | null
  signed_at: string | null
  signed_by: string | null
  expires_at: string | null
  created_at: string
  logoUrl?: string
}

export function ContractManagerModal({
  isOpen,
  onClose,
  contractId,
  eventId
}: ContractManagerModalProps) {
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (isOpen && contractId) {
      fetchContract()
    }
  }, [isOpen, contractId])

  const fetchContract = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contracts/${contractId}`)
      if (!response.ok) throw new Error('Failed to fetch contract')
      const data = await response.json()
      setContract(data)
    } catch (error) {
      console.error('Error fetching contract:', error)
      toast.error('Failed to load agreement')
    } finally {
      setLoading(false)
    }
  }

  const getSigningLink = () => {
    if (!contract) return ''
    const baseUrl = window.location.origin
    const tenant = window.location.pathname.split('/')[1]
    return `${baseUrl}/${tenant}/contracts/${contract.id}/sign`
  }

  const handleCopyLink = () => {
    const link = getSigningLink()
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    toast.success('Signing link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleOpenLink = () => {
    const link = getSigningLink()
    window.open(link, '_blank')
  }

  const getStatusBadge = () => {
    if (!contract) return null

    const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
      draft: { label: 'Draft', icon: Clock, color: 'bg-gray-100 text-gray-800' },
      sent: { label: 'Sent', icon: Clock, color: 'bg-blue-100 text-blue-800' },
      viewed: { label: 'Viewed', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      signed: { label: 'Signed', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      declined: { label: 'Declined', icon: XCircle, color: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', icon: XCircle, color: 'bg-gray-100 text-gray-800' }
    }

    const config = statusConfig[contract.status] || statusConfig.draft
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agreement Manager"
      className="sm:max-w-3xl"
    >
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Loading agreement...</p>
        </div>
      ) : contract ? (
        <div className="space-y-6">
          {/* Header with Status */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{contract.template_name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Created {new Date(contract.created_at).toLocaleDateString()}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Contract Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {contract.recipient_name && (
                <div>
                  <span className="text-gray-600">Recipient:</span>
                  <p className="font-medium text-gray-900">{contract.recipient_name}</p>
                </div>
              )}
              {contract.recipient_email && (
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium text-gray-900">{contract.recipient_email}</p>
                </div>
              )}
              {contract.signed_at && (
                <div>
                  <span className="text-gray-600">Signed On:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(contract.signed_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              {contract.signed_by && (
                <div>
                  <span className="text-gray-600">Signed By:</span>
                  <p className="font-medium text-gray-900 italic">{contract.signed_by}</p>
                </div>
              )}
            </div>
          </div>

          {/* E-Signature Link */}
          {contract.status !== 'signed' && contract.status !== 'expired' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Signature Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getSigningLink()}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className={copiedLink ? 'border-green-500 text-green-600' : ''}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Share this link with the client to sign the agreement electronically.
              </p>
            </div>
          )}

          {/* Agreement Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agreement Preview
            </label>
            <div className="border border-gray-300 rounded-lg p-6 max-h-96 overflow-y-auto bg-white">
              {contract.logoUrl && (
                <div className="flex justify-center mb-6 pb-4 border-b border-gray-200">
                  <img 
                    src={contract.logoUrl} 
                    alt="Company Logo" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={handleOpenLink}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Signing Page
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Agreement not found</p>
        </div>
      )}
    </Modal>
  )
}

