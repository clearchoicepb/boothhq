'use client'

import { Modal } from '@/components/ui/modal'
import { FormRenderer } from './FormRenderer'
import type { FormField, FormResponses, EventFormStatus } from '@/types/event-forms'

interface FormPreviewProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Form name */
  name: string
  /** Form fields */
  fields: FormField[]
  /** Existing responses (for viewing completed forms) */
  responses?: FormResponses | null
  /** Form status */
  status?: EventFormStatus
  /** Tenant branding */
  branding?: {
    logoUrl?: string | null
    companyName?: string
  }
}

/**
 * FormPreview Component
 *
 * Modal wrapper for previewing forms.
 * Shows how the form will look to clients.
 */
export function FormPreview({
  isOpen,
  onClose,
  name,
  fields,
  responses,
  status,
  branding,
}: FormPreviewProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Preview"
      size="lg"
    >
      <div className="max-h-[70vh] overflow-y-auto py-4">
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <FormRenderer
            name={name}
            fields={fields}
            responses={responses}
            status={status}
            readOnly={true}
            showSubmitButton={false}
            branding={branding}
          />
        </div>
      </div>
      <div className="text-center text-sm text-gray-500 mt-4">
        This is how the form will appear to your clients
      </div>
    </Modal>
  )
}

export default FormPreview
