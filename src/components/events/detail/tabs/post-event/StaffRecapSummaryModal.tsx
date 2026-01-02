'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, CheckCircle, Clock, Send, FileText, Download, ExternalLink, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { StaffFormWithRelations, StaffFormStatus } from '@/types/staff-forms'
import type { FormField } from '@/types/event-forms'
import { isPreviewableImage, getFileNameFromPath } from '@/types/event-forms'

interface StaffAssignmentDisplay {
  id: string
  userId: string
  userName: string
  userEmail: string
  roleName: string | null
  form: StaffFormWithRelations | null
}

interface StaffRecapSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  staffAssignments: StaffAssignmentDisplay[]
}

/**
 * Staff Recap Summary Modal
 *
 * Shows all staff recap responses in a single scrollable modal
 * with collapsible sections for each staff member.
 */
export function StaffRecapSummaryModal({
  isOpen,
  onClose,
  eventTitle,
  staffAssignments,
}: StaffRecapSummaryModalProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // Signed URLs keyed by "staffId:fieldId"
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set())

  // Fetch signed URLs for a specific staff member's file uploads
  const fetchSignedUrlsForStaff = useCallback(async (staffId: string, form: StaffFormWithRelations) => {
    const fields = form.fields as FormField[]
    const fileFields = fields.filter(f => f.type === 'file_upload')
    const responses = form.responses || {}
    const fileResponses = fileFields
      .map(f => ({ fieldId: f.id, path: responses[f.id] as string | null }))
      .filter(f => f.path)

    if (fileResponses.length === 0) return

    setLoadingUrls(prev => new Set([...prev, staffId]))

    const urls: Record<string, string> = {}
    for (const { fieldId, path } of fileResponses) {
      if (!path) continue
      const key = `${staffId}:${fieldId}`
      if (signedUrls[key]) continue // Already have URL

      try {
        const response = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(path)}`)
        if (response.ok) {
          const data = await response.json()
          urls[key] = data.signedUrl
        }
      } catch (error) {
        console.error('Error fetching signed URL:', error)
      }
    }

    setSignedUrls(prev => ({ ...prev, ...urls }))
    setLoadingUrls(prev => {
      const next = new Set(prev)
      next.delete(staffId)
      return next
    })
  }, [signedUrls])

  const toggleExpanded = (id: string, staff: StaffAssignmentDisplay) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Fetch signed URLs when expanding
        if (staff.form?.status === 'completed' && staff.form.responses) {
          fetchSignedUrlsForStaff(id, staff.form)
        }
      }
      return next
    })
  }

  const completedCount = staffAssignments.filter(s => s.form?.status === 'completed').length
  const totalCount = staffAssignments.length

  const getStatusDisplay = (form: StaffFormWithRelations | null) => {
    if (!form) {
      return {
        icon: <Clock className="h-4 w-4 text-gray-400" />,
        badge: <Badge variant="secondary" className="bg-gray-100 text-gray-600">Pending</Badge>,
        text: 'Form not yet sent',
      }
    }

    switch (form.status) {
      case 'sent':
        return {
          icon: <Send className="h-4 w-4 text-yellow-500" />,
          badge: <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Sent</Badge>,
          text: 'Awaiting response',
        }
      case 'viewed':
        return {
          icon: <Clock className="h-4 w-4 text-blue-500" />,
          badge: <Badge variant="secondary" className="bg-blue-100 text-blue-700">Viewed</Badge>,
          text: 'Form viewed, awaiting submission',
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          badge: <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>,
          text: form.completed_at
            ? `Submitted ${format(new Date(form.completed_at), 'MMM d, yyyy \'at\' h:mm a')}`
            : 'Submitted',
        }
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-400" />,
          badge: <Badge variant="secondary" className="bg-gray-100 text-gray-600">Pending</Badge>,
          text: 'Pending',
        }
    }
  }

  const renderFieldResponse = (field: FormField, responses: Record<string, any>, staffId: string) => {
    if (field.type === 'section' || field.type === 'paragraph') {
      return null
    }

    const value = responses[field.id]
    let displayValue: React.ReactNode = '—'

    if (value !== null && value !== undefined && value !== '') {
      if (field.type === 'file_upload') {
        const filePath = value as string
        const fileName = getFileNameFromPath(filePath)
        const urlKey = `${staffId}:${field.id}`
        const signedUrl = signedUrls[urlKey]
        const canPreview = isPreviewableImage(filePath)
        const isLoading = loadingUrls.has(staffId)

        if (isLoading) {
          displayValue = (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading file...</span>
            </div>
          )
        } else if (signedUrl) {
          displayValue = (
            <div className="space-y-1">
              {canPreview ? (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={signedUrl}
                    alt={fileName}
                    className="max-w-[200px] max-h-32 rounded border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-900 truncate flex-1">{fileName}</span>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-600 hover:text-blue-700"
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )
        } else {
          displayValue = (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <FileText className="h-3 w-3" />
              <span>{fileName}</span>
            </div>
          )
        }
      } else if (field.type === 'star_rating') {
        const rating = parseInt(value as string) || 0
        const maxRating = field.maxRating || 5
        displayValue = (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <svg
                key={i}
                className={`h-4 w-4 ${
                  i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-none'
                }`}
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            ))}
            <span className="ml-1 text-xs text-gray-500">({rating}/{maxRating})</span>
          </div>
        )
      } else if (field.type === 'multiselect' && Array.isArray(value)) {
        displayValue = value.join(', ')
      } else if (field.type === 'textarea') {
        displayValue = (
          <p className="text-gray-700 whitespace-pre-wrap text-sm">{value}</p>
        )
      } else {
        displayValue = value as string
      }
    }

    return (
      <div key={field.id} className="py-2">
        <p className="text-xs font-medium text-gray-500 mb-1">{field.label}</p>
        <div className="text-gray-700">{displayValue}</div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Recaps Summary"
      size="xl"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="text-sm text-gray-500 pb-4 border-b">
          <p className="font-medium text-gray-900">{eventTitle}</p>
          <p>{completedCount} of {totalCount} staff completed</p>
        </div>

        {/* Staff list */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {staffAssignments.map((staff) => {
            const isExpanded = expandedIds.has(staff.id)
            const status = getStatusDisplay(staff.form)
            const hasResponses = staff.form?.status === 'completed' && staff.form.responses

            return (
              <div
                key={staff.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Header row */}
                <button
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => hasResponses && toggleExpanded(staff.id, staff)}
                  disabled={!hasResponses}
                >
                  <div className="flex items-center gap-3">
                    {status.icon}
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{staff.userName}</p>
                      <p className="text-xs text-gray-500">
                        {staff.roleName || 'Team Member'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {status.badge}
                    {hasResponses && (
                      isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && hasResponses && staff.form && (
                  <div className="p-4 border-t bg-white">
                    <p className="text-xs text-gray-500 mb-3">{status.text}</p>
                    <div className="divide-y">
                      {(staff.form.fields as FormField[]).map((field) =>
                        renderFieldResponse(field, staff.form!.responses || {}, staff.id)
                      )}
                    </div>
                  </div>
                )}

                {/* Status text for non-completed */}
                {!hasResponses && (
                  <div className="px-4 py-2 text-xs text-gray-500 bg-white border-t">
                    {status.text}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default StaffRecapSummaryModal
