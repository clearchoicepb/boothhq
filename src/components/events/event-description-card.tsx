import { Edit, Check, X } from 'lucide-react'

interface EventDescriptionCardProps {
  description: string | null
  isEditing: boolean
  editedDescription: string
  onStartEdit: () => void
  onDescriptionChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  canEdit: boolean
}

/**
 * Card for displaying and editing event description
 */
export function EventDescriptionCard({
  description,
  isEditing,
  editedDescription,
  onStartEdit,
  onDescriptionChange,
  onSave,
  onCancel,
  canEdit,
}: EventDescriptionCardProps) {
  if (isEditing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Description</h2>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              title="Save changes"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <textarea
          value={editedDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={6}
          placeholder="Enter event description..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent resize-none"
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Description</h2>
        {canEdit && (
          <button
            onClick={onStartEdit}
            className="p-1 text-gray-400 hover:text-[#347dc4] transition-colors"
            title="Edit description"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">
        {description || <span className="text-gray-400 italic">No description set</span>}
      </p>
    </div>
  )
}

