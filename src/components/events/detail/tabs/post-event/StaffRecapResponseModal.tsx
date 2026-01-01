'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { StaffFormWithRelations } from '@/types/staff-forms'
import type { FormField } from '@/types/event-forms'

interface StaffRecapResponseModalProps {
  isOpen: boolean
  onClose: () => void
  form: StaffFormWithRelations
}

/**
 * Staff Recap Response Modal
 *
 * Shows the responses from a single staff member's recap form.
 */
export function StaffRecapResponseModal({
  isOpen,
  onClose,
  form,
}: StaffRecapResponseModalProps) {
  const user = form.staff_assignment?.users
  const role = form.staff_assignment?.staff_roles
  const staffName = user ? `${user.first_name} ${user.last_name}` : 'Staff Member'
  const roleName = role?.name || 'Team Member'

  const responses = form.responses || {}
  const fields = form.fields as FormField[]
  const submittedAt = responses._submittedAt
    ? format(new Date(responses._submittedAt as string), 'MMM d, yyyy \'at\' h:mm a')
    : null

  const renderFieldResponse = (field: FormField) => {
    if (field.type === 'section' || field.type === 'paragraph') {
      return null // Skip display-only fields
    }

    const value = responses[field.id]

    // Format the response based on field type
    let displayValue: React.ReactNode = '—'

    if (value !== null && value !== undefined && value !== '') {
      if (field.type === 'star_rating') {
        const rating = parseInt(value as string) || 0
        const maxRating = field.maxRating || 5
        displayValue = (
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <svg
                key={i}
                className={`h-5 w-5 ${
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
            <span className="ml-2 text-sm text-gray-600">({rating}/{maxRating})</span>
          </div>
        )
      } else if (field.type === 'multiselect' && Array.isArray(value)) {
        displayValue = value.join(', ')
      } else if (field.type === 'textarea') {
        displayValue = (
          <p className="text-gray-700 whitespace-pre-wrap">{value}</p>
        )
      } else {
        displayValue = value as string
      }
    }

    return (
      <div key={field.id} className="py-3">
        <p className="text-sm font-medium text-gray-900 mb-1">{field.label}</p>
        <div className="text-gray-600">{displayValue}</div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Staff Recap: ${staffName}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-center justify-between text-sm text-gray-500 pb-4 border-b">
          <span>{roleName}</span>
          {submittedAt && (
            <span>Submitted {submittedAt}</span>
          )}
        </div>

        {/* Responses */}
        <div className="divide-y">
          {fields.map((field) => renderFieldResponse(field))}
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

export default StaffRecapResponseModal
