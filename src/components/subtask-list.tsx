'use client'

/**
 * SubtaskList Component
 * Displays subtasks within a parent task with inline editing
 *
 * Features:
 * - Progress badge in header
 * - Add subtask modal
 * - Inline editing for subtasks
 * - Status toggle with optimistic updates
 */

import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
  Calendar,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useSubtasks } from '@/hooks/useTaskData'
import {
  useCreateSubtask,
  useUpdateSubtaskStatus,
  useDeleteTask,
  useUpdateTask,
} from '@/hooks/useTaskActions'
import { useUsers } from '@/hooks/useUsers'
import type { TaskWithRelations, SubtaskProgress } from '@/types/tasks'
import { formatSubtaskProgress } from '@/types/tasks'

interface SubtaskListProps {
  parentTaskId: string
  parentDueDate?: string | null
  onSubtaskChange?: () => void
}

export function SubtaskList({
  parentTaskId,
  parentDueDate,
  onSubtaskChange,
}: SubtaskListProps) {
  const { data: subtasks = [], isLoading, refetch } = useSubtasks(parentTaskId)
  const { data: users = [] } = useUsers()
  const { createSubtask, isPending: isCreating } = useCreateSubtask()
  const { updateSubtaskStatus } = useUpdateSubtaskStatus()
  const { deleteTask } = useDeleteTask()
  const { updateTask } = useUpdateTask()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null)
  const [editingSubtask, setEditingSubtask] = useState<TaskWithRelations | null>(null)

  // Calculate progress
  const progress: SubtaskProgress = {
    total: subtasks.length,
    completed: subtasks.filter(
      (st) => st.status === 'completed' || st.status === 'approved'
    ).length,
  }

  const handleStatusToggle = async (subtask: TaskWithRelations) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed'
    await updateSubtaskStatus({
      subtaskId: subtask.id,
      parentTaskId,
      status: newStatus,
    })
    onSubtaskChange?.()
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return
    await deleteTask(subtaskId)
    refetch()
    onSubtaskChange?.()
  }

  const getStatusIcon = (status: string, size = 'h-4 w-4') => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle2 className={`${size} text-green-600`} />
      case 'in_progress':
        return <Clock className={`${size} text-blue-600`} />
      case 'cancelled':
        return <AlertCircle className={`${size} text-gray-400`} />
      default:
        return <Circle className={`${size} text-gray-400`} />
    }
  }

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
      </div>
    )
  }

  return (
    <div className="mt-6 pt-4 border-t">
      {/* Header with progress badge */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          Subtasks
          {progress.total > 0 && (
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {formatSubtaskProgress(progress)}
            </span>
          )}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Subtask
        </Button>
      </div>

      {/* Subtask list */}
      {subtasks.length === 0 ? (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">No subtasks yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              users={users}
              isExpanded={expandedSubtaskId === subtask.id}
              onToggleExpand={() =>
                setExpandedSubtaskId(
                  expandedSubtaskId === subtask.id ? null : subtask.id
                )
              }
              onStatusToggle={() => handleStatusToggle(subtask)}
              onDelete={() => handleDeleteSubtask(subtask.id)}
              onUpdate={async (updates) => {
                await updateTask({ taskId: subtask.id, updates })
                refetch()
                onSubtaskChange?.()
              }}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      )}

      {/* Add Subtask Modal */}
      <AddSubtaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        parentTaskId={parentTaskId}
        parentDueDate={parentDueDate}
        users={users}
        onSuccess={(keepOpen) => {
          if (!keepOpen) {
            setIsAddModalOpen(false)
          }
          refetch()
          onSubtaskChange?.()
        }}
      />
    </div>
  )
}

// ============================================================================
// SubtaskRow Component
// ============================================================================

interface SubtaskRowProps {
  subtask: TaskWithRelations
  users: any[]
  isExpanded: boolean
  onToggleExpand: () => void
  onStatusToggle: () => void
  onDelete: () => void
  onUpdate: (updates: any) => Promise<void>
  getStatusIcon: (status: string, size?: string) => React.ReactNode
}

function SubtaskRow({
  subtask,
  users,
  isExpanded,
  onToggleExpand,
  onStatusToggle,
  onDelete,
  onUpdate,
  getStatusIcon,
}: SubtaskRowProps) {
  const [editForm, setEditForm] = useState({
    title: subtask.title,
    assignedTo: subtask.assigned_to || '',
    dueDate: subtask.due_date
      ? new Date(subtask.due_date).toISOString().split('T')[0]
      : '',
    status: subtask.status,
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate({
        title: editForm.title,
        assigned_to: editForm.assignedTo || null,
        due_date: editForm.dueDate || null,
        status: editForm.status,
      })
      onToggleExpand()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isExpanded ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={onToggleExpand}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onStatusToggle()
          }}
          className="flex-shrink-0"
        >
          {getStatusIcon(subtask.status)}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm text-gray-900 truncate ${
              subtask.status === 'completed' ? 'line-through text-gray-500' : ''
            }`}
          >
            {subtask.title}
          </p>
        </div>

        {/* Assignee avatar/name */}
        {subtask.assigned_to_user && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="h-3 w-3" />
            <span className="hidden sm:inline">
              {subtask.assigned_to_user.first_name}
            </span>
          </div>
        )}

        {/* Due date */}
        {subtask.due_date && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{new Date(subtask.due_date).toLocaleDateString()}</span>
          </div>
        )}

        {/* Expand chevron */}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* Expanded edit panel */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-blue-200 space-y-3">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Assignee
              </label>
              <select
                value={editForm.assignedTo}
                onChange={(e) =>
                  setEditForm({ ...editForm, assignedTo: e.target.value })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Unassigned</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={editForm.dueDate}
                onChange={(e) =>
                  setEditForm({ ...editForm, dueDate: e.target.value })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value as any })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !editForm.title.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Done'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// AddSubtaskModal Component
// ============================================================================

interface AddSubtaskModalProps {
  isOpen: boolean
  onClose: () => void
  parentTaskId: string
  parentDueDate?: string | null
  users: any[]
  onSuccess: (keepOpen?: boolean) => void
}

function AddSubtaskModal({
  isOpen,
  onClose,
  parentTaskId,
  parentDueDate,
  users,
  onSuccess,
}: AddSubtaskModalProps) {
  const { createSubtask, isPending } = useCreateSubtask()
  const [formData, setFormData] = useState({
    title: '',
    assignedTo: '',
    dueDate: parentDueDate
      ? new Date(parentDueDate).toISOString().split('T')[0]
      : '',
    status: 'pending' as const,
  })
  const [error, setError] = useState('')

  const resetForm = () => {
    setFormData({
      title: '',
      assignedTo: '',
      dueDate: parentDueDate
        ? new Date(parentDueDate).toISOString().split('T')[0]
        : '',
      status: 'pending',
    })
    setError('')
  }

  const saveSubtask = async (keepOpen: boolean) => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    try {
      await createSubtask({
        parentTaskId,
        title: formData.title,
        assignedTo: formData.assignedTo || null,
        dueDate: formData.dueDate || null,
        status: formData.status,
      })
      resetForm()
      onSuccess(keepOpen)
    } catch (err: any) {
      setError(err.message || 'Failed to create subtask')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveSubtask(false)
  }

  const handleSaveAndAddAnother = () => {
    saveSubtask(true)
  }

  // Reset form when modal closes
  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Subtask"
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value })
              if (error) setError('')
            }}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            autoFocus
          />
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assignee
          </label>
          <select
            value={formData.assignedTo}
            onChange={(e) =>
              setFormData({ ...formData, assignedTo: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">Unassigned</option>
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveAndAddAnother}
            disabled={isPending || !formData.title.trim()}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save + Add Another'
            )}
          </Button>
          <Button
            type="submit"
            disabled={isPending || !formData.title.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Subtask'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
