'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Edit, Copy, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('events')

interface EventQuickActionsMenuProps {
  eventId: string
  eventTitle: string
  tenantSubdomain: string
  onDelete: (eventId: string) => void
}

export function EventQuickActionsMenu({
  eventId,
  eventTitle,
  tenantSubdomain,
  onDelete
}: EventQuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleView = () => {
    router.push(`/${tenantSubdomain}/events/${eventId}`)
    setIsOpen(false)
  }

  const handleEdit = () => {
    router.push(`/${tenantSubdomain}/events/${eventId}/edit`)
    setIsOpen(false)
  }

  const handleDuplicate = async () => {
    setIsOpen(false)

    try {
      const response = await fetch(`/api/events/${eventId}/duplicate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate event')
      }

      const data = await response.json()
      toast.success(`Event duplicated successfully!`)

      // Navigate to the new event
      router.push(`/${tenantSubdomain}/events/${data.id}/edit`)
    } catch (error) {
      log.error({ error }, 'Error duplicating event')
      toast.error('Failed to duplicate event')
    }
  }

  const handleDelete = () => {
    setIsOpen(false)
    onDelete(eventId)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* View Details */}
          <button
            onClick={handleView}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>

          {/* Edit */}
          <button
            onClick={handleEdit}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Event
          </button>

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicate Event
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Event
          </button>
        </div>
      )}
    </div>
  )
}
