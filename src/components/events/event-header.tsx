'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, MoreVertical, Copy, RefreshCw, Link as LinkIcon, Eye, EyeOff, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDuplicateEvent, useTriggerWorkflows } from '@/hooks/useEventDetail'
import toast from 'react-hot-toast'

interface EventHeaderProps {
  title: string
  tenantSubdomain: string
  eventId: string
  canManageEvents: boolean
  onDelete: () => void
  publicToken?: string | null
  publicPageEnabled?: boolean
  onPublicTokenChange?: (token: string) => void
  onPublicPageEnabledChange?: (enabled: boolean) => void
}

export function EventHeader({
  title,
  tenantSubdomain,
  eventId,
  canManageEvents,
  onDelete,
  publicToken,
  publicPageEnabled = true,
  onPublicTokenChange,
  onPublicPageEnabledChange,
}: EventHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isTogglingAccess, setIsTogglingAccess] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { confirm } = useConfirmDialog()

  // Use mutation hooks for API calls
  const duplicateMutation = useDuplicateEvent(eventId)
  const triggerWorkflowsMutation = useTriggerWorkflows(eventId)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleDuplicate = async () => {
    setIsMenuOpen(false)

    const confirmed = await confirm({
      title: 'Duplicate Event',
      message: 'Create a duplicate of this event? This will copy all event details to a new event.',
      confirmText: 'Duplicate',
      variant: 'info'
    })

    if (confirmed) {
      const result = await duplicateMutation.mutateAsync()
      router.push(`/${tenantSubdomain}/events/${result.id}`)
    }
  }

  const handleTriggerWorkflows = async () => {
    setIsMenuOpen(false)

    const confirmed = await confirm({
      title: 'Trigger Workflows',
      message: 'Manually trigger workflows for this event? This will create tasks and design items based on the event type.',
      confirmText: 'Trigger',
      variant: 'info'
    })

    if (confirmed) {
      const result = await triggerWorkflowsMutation.mutateAsync()
      // Refresh page if workflows were executed to show new tasks
      if (result.stats.workflowsExecuted > 0) {
        window.location.reload()
      }
    }
  }

  const handleCopyPublicLink = () => {
    setIsMenuOpen(false)
    if (!publicToken) {
      toast.error('Public link not available')
      return
    }

    const publicUrl = `${window.location.origin}/event/${publicToken}`
    navigator.clipboard.writeText(publicUrl)
      .then(() => {
        toast.success('Public link copied to clipboard')
      })
      .catch(() => {
        toast.error('Failed to copy link')
      })
  }

  const handleTogglePublicAccess = async () => {
    setIsMenuOpen(false)
    setIsTogglingAccess(true)

    try {
      const response = await fetch(`/api/events/${eventId}/public-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_page_enabled: !publicPageEnabled })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle access')
      }

      const data = await response.json()
      onPublicPageEnabledChange?.(data.public_page_enabled)
      toast.success(data.public_page_enabled ? 'Public page enabled' : 'Public page disabled')
    } catch {
      toast.error('Failed to update public access')
    } finally {
      setIsTogglingAccess(false)
    }
  }

  const handleRegenerateToken = async () => {
    setIsMenuOpen(false)

    const confirmed = await confirm({
      title: 'Regenerate Public Link',
      message: 'Are you sure you want to regenerate the public link? The current link will stop working.',
      confirmText: 'Regenerate',
      variant: 'danger'
    })

    if (!confirmed) return

    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/events/${eventId}/public-token`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate token')
      }

      const data = await response.json()
      onPublicTokenChange?.(data.public_token)
      toast.success('Public link regenerated')
    } catch {
      toast.error('Failed to regenerate public link')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/${tenantSubdomain}/events`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="flex items-center gap-3">
              <p className="text-gray-600">Event Details</p>
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                ID: {eventId}
              </span>
            </div>
          </div>
        </div>
        {canManageEvents && (
          <div className="flex space-x-2">
            <Link href={`/${tenantSubdomain}/events/${eventId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            {/* More Actions Dropdown */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {/* Public Link Section */}
                  {publicToken && (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Public Event Page</p>
                      </div>
                      <button
                        onClick={handleCopyPublicLink}
                        disabled={!publicPageEnabled}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                          publicPageEnabled
                            ? 'text-gray-700 hover:bg-gray-50'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <LinkIcon className="h-4 w-4" />
                        Copy Public Link
                      </button>
                      <button
                        onClick={handleTogglePublicAccess}
                        disabled={isTogglingAccess}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        {publicPageEnabled ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Disable Public Access
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Enable Public Access
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleRegenerateToken}
                        disabled={isRegenerating}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Regenerate Link
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                    </>
                  )}
                  <button
                    onClick={handleDuplicate}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate Event
                  </button>
                  <button
                    onClick={handleTriggerWorkflows}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Trigger Workflows
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
