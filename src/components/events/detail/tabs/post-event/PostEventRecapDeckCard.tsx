'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, Download, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('PostEventRecapDeckCard')

interface PostEventRecapDeckCardProps {
  eventId: string
  recapDeckPath: string | null
  recapDeckUploadedAt: string | null
  recapDeckUploadedBy: string | null
  onUpdate: () => Promise<void>
  canEdit: boolean
}

/**
 * Recap Deck Upload Card
 *
 * Handles PDF upload for post-event recap decks.
 * Stores file in Supabase Storage and path in events table.
 */
export function PostEventRecapDeckCard({
  eventId,
  recapDeckPath,
  recapDeckUploadedAt,
  recapDeckUploadedBy,
  onUpdate,
  canEdit,
}: PostEventRecapDeckCardProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasFile = !!recapDeckPath

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entity_type', 'event')
      formData.append('entity_id', eventId)
      formData.append('field_type', 'recap_deck')

      const response = await fetch(`/api/events/${eventId}/recap-deck`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      await onUpdate()
      toast.success('Recap deck uploaded successfully')
    } catch (error) {
      log.error({ error }, 'Failed to upload recap deck')
      toast.error('Failed to upload recap deck')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = async () => {
    if (!recapDeckPath) return

    setIsDownloading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/recap-deck`)
      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const { downloadUrl, fileName } = await response.json()

      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName || 'recap-deck.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      log.error({ error }, 'Failed to download recap deck')
      toast.error('Failed to download file')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recap deck?')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/recap-deck`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      await onUpdate()
      toast.success('Recap deck deleted')
    } catch (error) {
      log.error({ error }, 'Failed to delete recap deck')
      toast.error('Failed to delete recap deck')
    } finally {
      setIsDeleting(false)
    }
  }

  // Extract filename from path
  const fileName = recapDeckPath ? recapDeckPath.split('/').pop() : null

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Post Event Recap Deck</h3>
            <p className="text-sm text-gray-500">Upload a PDF recap deck for this event</p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {hasFile ? (
        <div className="space-y-3">
          {/* File info */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileName}
                </p>
                {recapDeckUploadedAt && (
                  <p className="text-xs text-gray-500">
                    Uploaded {format(new Date(recapDeckUploadedAt), 'MMM d, yyyy')}
                    {recapDeckUploadedBy && ` by ${recapDeckUploadedBy}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </>
                )}
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Replace button */}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Replace PDF
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-3">No recap deck uploaded yet</p>
          {canEdit && (
            <Button
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

export default PostEventRecapDeckCard
