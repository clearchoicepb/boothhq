'use client'

import { useState, useEffect } from 'react'
import { Paperclip, Download, Trash2, File } from 'lucide-react'

interface Attachment {
  id: string
  file_name: string
  file_size: number
  file_type: string
  description: string | null
  created_at: string
  uploaded_by_user: {
    first_name: string
    last_name: string
    email: string
  } | null
}

interface AttachmentListProps {
  entityType: 'opportunity' | 'account' | 'contact' | 'lead' | 'invoice' | 'event'
  entityId: string
  refreshTrigger?: number
}

export default function AttachmentList({ entityType, entityId, refreshTrigger = 0 }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchAttachments = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
      })

      const response = await fetch(`/api/attachments?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch attachments')
      }

      const data = await response.json()
      setAttachments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttachments()
  }, [entityType, entityId, refreshTrigger])

  const handleDownload = async (attachmentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`)

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const data = await response.json()

      // Open download URL in new tab
      window.open(data.download_url, '_blank')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file')
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return
    }

    try {
      setDeletingId(attachmentId)

      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete attachment')
      }

      // Remove from list
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8">
        <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No attachments yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <File className="h-8 w-8 text-gray-400 flex-shrink-0 mt-0.5" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.file_name}
                </p>

                <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(attachment.created_at)}</span>
                </div>

                {attachment.uploaded_by_user && (
                  <p className="mt-1 text-xs text-gray-500">
                    Uploaded by {attachment.uploaded_by_user.first_name} {attachment.uploaded_by_user.last_name}
                  </p>
                )}

                {attachment.description && (
                  <p className="mt-2 text-sm text-gray-600">{attachment.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(attachment.id, attachment.file_name)}
                className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => handleDelete(attachment.id)}
                disabled={deletingId === attachment.id}
                className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 disabled:opacity-50"
                title="Delete"
              >
                {deletingId === attachment.id ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
