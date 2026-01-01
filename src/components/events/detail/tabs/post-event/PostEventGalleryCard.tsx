'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Video, ExternalLink, Pencil, Check, X, Link as LinkIcon, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('PostEventGalleryCard')

interface PostEventGalleryCardProps {
  eventId: string
  title: string
  description: string
  icon: 'camera' | 'video'
  fieldName: 'photo_gallery_url' | 'bts_gallery_url'
  currentUrl: string | null
  onUpdate: () => Promise<void>
  canEdit: boolean
}

/**
 * Gallery Link Card
 *
 * Inline-editable URL field with external link button.
 * Used for Photo Gallery and BTS Gallery links.
 */
export function PostEventGalleryCard({
  eventId,
  title,
  description,
  icon,
  fieldName,
  currentUrl,
  onUpdate,
  canEdit,
}: PostEventGalleryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUrl, setEditedUrl] = useState(currentUrl || '')
  const [isSaving, setIsSaving] = useState(false)

  const Icon = icon === 'camera' ? Camera : Video

  const handleStartEdit = () => {
    setEditedUrl(currentUrl || '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditedUrl(currentUrl || '')
    setIsEditing(false)
  }

  const handleSave = async () => {
    // Validate URL if provided
    if (editedUrl && !isValidUrl(editedUrl)) {
      toast.error('Please enter a valid URL')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: editedUrl || null }),
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      await onUpdate()
      setIsEditing(false)
      toast.success('Gallery link updated')
    } catch (error) {
      log.error({ error }, 'Failed to save gallery URL')
      toast.error('Failed to save gallery link')
    } finally {
      setIsSaving(false)
    }
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {canEdit && !isEditing && (
          <Button variant="ghost" size="sm" onClick={handleStartEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="url"
                value={editedUrl}
                onChange={(e) => setEditedUrl(e.target.value)}
                placeholder="https://example.com/gallery"
                className="pl-10"
                autoFocus
              />
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : currentUrl ? (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">{currentUrl}</span>
          </div>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 ml-4"
          >
            Open Gallery
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">No link added yet</p>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleStartEdit}
            >
              Add Link
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

export default PostEventGalleryCard
