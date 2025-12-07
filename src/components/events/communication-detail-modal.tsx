import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { linkifyText } from "@/lib/linkify"

interface CommunicationDetailModalProps {
  communication: any | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal for viewing communication details
 * Displays type, direction, date, subject, and notes
 */
export function CommunicationDetailModal({
  communication,
  isOpen,
  onClose
}: CommunicationDetailModalProps) {
  if (!communication) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Communication Details"
      className="sm:max-w-2xl"
    >
      <div className="flex max-h-[80vh] flex-col space-y-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium ${
              communication.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
              communication.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
              communication.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
              communication.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {communication.communication_type === 'in_person' ? 'In-Person' : communication.communication_type.toUpperCase()}
            </span>
            <span className={`inline-flex items-center rounded-md px-3 py-1 text-sm font-medium ${
              communication.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {communication.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">Date & Time</label>
            <p className="text-base text-gray-900">
              {new Date(communication.communication_date).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {communication.subject && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-500">Subject</label>
              <p className="text-base font-medium text-gray-900">{communication.subject}</p>
            </div>
          )}

          {communication.notes && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-500">
                {communication.communication_type === 'email' ? 'Email Content' :
                 communication.communication_type === 'sms' ? 'Message' :
                 'Notes'}
              </label>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-900">
                  {communication.communication_type === 'sms'
                    ? linkifyText(communication.notes, 'text-blue-600 underline hover:text-blue-800')
                    : communication.notes}
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(communication.created_at).toLocaleDateString()}
              </div>
              {communication.created_by_name && (
                <div>
                  <span className="font-medium">Created By:</span>{' '}
                  {communication.created_by_name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

