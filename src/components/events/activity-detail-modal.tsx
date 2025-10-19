import { Button } from "@/components/ui/button"
import { X, ListTodo, FileText, Paperclip } from "lucide-react"

interface ActivityDetailModalProps {
  activity: any | null
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal for viewing activity details
 * Supports tasks, notes, and attachments with type-specific fields
 */
export function ActivityDetailModal({
  activity,
  isOpen,
  onClose
}: ActivityDetailModalProps) {
  if (!isOpen || !activity) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {activity.type === 'task' && <ListTodo className="h-6 w-6 text-purple-600" />}
              {activity.type === 'note' && <FileText className="h-6 w-6 text-orange-600" />}
              {activity.type === 'attachment' && <Paperclip className="h-6 w-6 text-gray-600" />}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{activity.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(activity.date).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {activity.description && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  {activity.type === 'task' ? 'Description' :
                   activity.type === 'note' ? 'Note Content' :
                   'Details'}
                </label>
                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{activity.description}</p>
                </div>
              </div>
            )}

            {/* Task-specific fields */}
            {activity.type === 'task' && activity.metadata && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activity.metadata.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activity.metadata.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      activity.metadata.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.metadata.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activity.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      activity.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      activity.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.metadata.priority}
                    </span>
                  </div>
                </div>
                {activity.metadata.due_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Due Date</label>
                    <p className="text-sm text-gray-900">
                      {new Date(activity.metadata.due_date).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Attachment-specific fields */}
            {activity.type === 'attachment' && activity.metadata && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">File Name</label>
                <p className="text-sm text-gray-900 font-mono">{activity.metadata.file_name}</p>
              </div>
            )}

            {/* Note-specific fields */}
            {activity.type === 'note' && activity.metadata && activity.metadata.content && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Full Note</label>
                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{activity.metadata.content}</p>
                </div>
              </div>
            )}
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

