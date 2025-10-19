import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

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
  if (!isOpen || !communication) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Communication Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Type and Direction */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                communication.communication_type === 'email' ? 'bg-blue-100 text-blue-800' :
                communication.communication_type === 'sms' ? 'bg-green-100 text-green-800' :
                communication.communication_type === 'phone' ? 'bg-purple-100 text-purple-800' :
                communication.communication_type === 'in_person' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {communication.communication_type === 'in_person' ? 'In-Person' : communication.communication_type.toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                communication.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {communication.direction === 'inbound' ? '← Inbound' : '→ Outbound'}
              </span>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Date & Time</label>
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

            {/* Subject */}
            {communication.subject && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Subject</label>
                <p className="text-base text-gray-900 font-medium">{communication.subject}</p>
              </div>
            )}

            {/* Notes/Content */}
            {communication.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  {communication.communication_type === 'email' ? 'Email Content' :
                   communication.communication_type === 'sms' ? 'Message' :
                   'Notes'}
                </label>
                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{communication.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200">
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

          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

