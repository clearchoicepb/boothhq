'use client'

import { useState, useEffect } from 'react'
import { FileImage, Copy, Trash2, CheckCircle, Clock, XCircle, Eye, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import type { DesignProofWithDetails, DesignProofStatus } from '@/types/events'

const log = createLogger('components:design-proofs-list')

interface DesignProofsListProps {
  eventId: string
  refreshTrigger?: number
}

export function DesignProofsList({ eventId, refreshTrigger = 0 }: DesignProofsListProps) {
  const [proofs, setProofs] = useState<DesignProofWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { confirm } = useConfirmDialog()

  const fetchProofs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/design-proofs?event_id=${eventId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch design proofs')
      }

      const data = await response.json()
      setProofs(data)
    } catch (err) {
      log.error({ err }, 'Error fetching design proofs')
      setError(err instanceof Error ? err.message : 'Failed to load design proofs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProofs()
  }, [eventId, refreshTrigger])

  const handleCopyLink = (publicToken: string) => {
    const url = `${window.location.origin}/proof/${publicToken}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard!')
  }

  const handleOpenLink = (publicToken: string) => {
    const url = `${window.location.origin}/proof/${publicToken}`
    window.open(url, '_blank')
  }

  const handleDelete = async (proofId: string) => {
    const confirmed = await confirm({
      title: 'Delete Design Proof',
      message: 'Are you sure you want to delete this design proof? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    })

    if (!confirmed) return

    try {
      setDeletingId(proofId)

      const response = await fetch(`/api/design-proofs/${proofId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete design proof')
      }

      setProofs(prev => prev.filter(p => p.id !== proofId))
      toast.success('Design proof deleted')
    } catch (err) {
      log.error({ err }, 'Error deleting design proof')
      toast.error('Failed to delete design proof')
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: DesignProofStatus, respondedAt: string | null) => {
    const config: Record<DesignProofStatus, { label: string; icon: typeof CheckCircle; color: string }> = {
      pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-800' }
    }

    const statusConfig = config[status]
    const Icon = statusConfig.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-500">Loading design proofs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (proofs.length === 0) {
    return null // Don't render anything if no proofs
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Design Proofs</h4>
      <div className="space-y-2">
        {proofs.map((proof) => (
          <div
            key={proof.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center min-w-0 flex-1">
              <FileImage className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div className="ml-3 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {proof.proof_name || proof.file_name}
                  </p>
                  {getStatusBadge(proof.status, proof.responded_at)}
                </div>
                <p className="text-xs text-gray-500">
                  {proof.file_name} • {formatFileSize(proof.file_size)} • Uploaded {formatDate(proof.uploaded_at)}
                  {proof.uploaded_by_user &&
                    ` by ${proof.uploaded_by_user.first_name} ${proof.uploaded_by_user.last_name}`
                  }
                </p>
                {proof.status !== 'pending' && proof.client_name && (
                  <p className="text-xs text-gray-500 mt-1">
                    {proof.status === 'approved' ? 'Approved' : 'Rejected'} by {proof.client_name}
                    {proof.responded_at && ` on ${formatDate(proof.responded_at)}`}
                  </p>
                )}
                {proof.status === 'rejected' && proof.client_notes && (
                  <p className="text-xs text-red-600 mt-1 italic">
                    &quot;{proof.client_notes}&quot;
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenLink(proof.public_token)}
                title="Preview"
                className="p-2"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyLink(proof.public_token)}
                title="Copy link"
                className="p-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(proof.id)}
                disabled={deletingId === proof.id}
                title="Delete"
                className="p-2 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
