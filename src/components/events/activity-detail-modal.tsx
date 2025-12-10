import { Button } from "@/components/ui/button"
import { ListTodo, FileText, Paperclip } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import type { EventActivity } from "@/types/events"

interface ActivityDetailModalProps {
  activity: EventActivity | null
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
  if (!activity) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activity.title}
      className="sm:max-w-2xl"
    >
      <div className="flex max-h-[80vh] flex-col">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-3">
            {activity.type === 'task' && <ListTodo className="h-6 w-6 text-purple-600" />}
            {activity.type === 'note' && <FileText className="h-6 w-6 text-orange-600" />}
            {activity.type === 'attachment' && <Paperclip className="h-6 w-6 text-gray-600" />}
            <div>
              <p className="text-sm text-gray-500">
                {new Date(activity.date).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto space-y-4">
          {activity.description && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500">
                {activity.type === 'task' ? 'Description' :
                 activity.type === 'note' ? 'Note Content' :
                 'Details'}
              </label>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-900">{activity.description}</p>
              </div>
            </div>
          )}

          {/* Task-specific fields */}
          {activity.type === 'task' && activity.metadata ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    activity.metadata.status === 'completed' ? 'bg-green-100 text-green-800' :
                    activity.metadata.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    activity.metadata.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {String(activity.metadata.status ?? '')}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500">Priority</label>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    activity.metadata.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    activity.metadata.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    activity.metadata.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {String(activity.metadata.priority ?? '')}
                  </span>
                </div>
              </div>
              {activity.metadata.due_date ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500">Due Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(String(activity.metadata.due_date)).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {/* Attachment-specific fields */}
          {activity.type === 'attachment' && activity.metadata ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-500">File Name</label>
              <p className="font-mono text-sm text-gray-900">{String(activity.metadata.file_name ?? '')}</p>
            </div>
          ) : null}

          {/* Note-specific fields */}
          {activity.type === 'note' && activity.metadata && activity.metadata.content ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500">Full Note</label>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-900">{String(activity.metadata.content)}</p>
              </div>
            </div>
          ) : null}
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
    </Modal>
  )
}

