'use client'

interface DesignItemDetails {
  id: string
  status: string
  assigned_designer?: { id: string | null } | null
  internal_notes?: string | null
  design_deadline?: string | null
  design_item_type?: { name?: string | null } | null
  item_name?: string | null
}

interface DesignerUser {
  id: string
  name?: string | null
  email?: string | null
}

interface DesignStatusOption {
  id: string
  slug: string
  name: string
  is_active: boolean
}

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/modal'

interface EditDesignItemModalProps {
  eventId: string
  designItem: DesignItemDetails
  onClose: () => void
  onSuccess: () => void
  isOpen?: boolean
}

export function EditDesignItemModal({ eventId, designItem, onClose, onSuccess, isOpen = true }: EditDesignItemModalProps) {
  const [users, setUsers] = useState<DesignerUser[]>([])
  const [designStatuses, setDesignStatuses] = useState<DesignStatusOption[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: designItem.status,
    assigned_designer_id: designItem.assigned_designer?.id || '',
    internal_notes: designItem.internal_notes || '',
    design_deadline: designItem.design_deadline ?? ''
  })

  useEffect(() => {
    fetchUsers()
    fetchDesignStatuses()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (_error) {
      console.error('Error fetching users:', _error)
    }
  }

  const fetchDesignStatuses = async () => {
    try {
      const res = await fetch('/api/design/statuses')
      const data = (await res.json()) as { statuses?: DesignStatusOption[] }
      setDesignStatuses(data.statuses?.filter(Boolean) ?? [])
    } catch (_error) {
      console.error('Error fetching design statuses:', _error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/events/${eventId}/design-items/${designItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success('Design item updated')
      onSuccess()
    } catch {
      toast.error('Failed to update design item')
    } finally {
      setLoading(false)
    }
  }

  const itemName = designItem.item_name || designItem.design_item_type?.name || 'Design Item'

  // Filter to only show active statuses
  const activeStatuses = designStatuses.filter((status) => status.is_active)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit: ${itemName}`}
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          {/* Status */}
        <div>
          <label htmlFor="edit-design-status" className="block text-sm font-medium text-gray-700">
            <span className="mb-2 block">Status</span>
            <select
              id="edit-design-status"
              name="status"
              title="Design Status"
              aria-label="Design Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
            >
              {activeStatuses.map((status) => (
                <option key={status.id} value={status.slug}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
        </div>

          {/* Assigned Designer */}
        <div>
          <label htmlFor="edit-assigned-designer" className="block text-sm font-medium text-gray-700">
            <span className="mb-2 block">Assigned Designer</span>
            <select
              id="edit-assigned-designer"
              name="assigned_designer_id"
              title="Assigned Designer"
              aria-label="Assigned Designer"
              value={formData.assigned_designer_id}
              onChange={(e) => setFormData({ ...formData, assigned_designer_id: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </label>
        </div>

          {/* Deadline */}
        <div>
          <label htmlFor="edit-design-deadline" className="block text-sm font-medium text-gray-700">
            <span className="mb-2 block">Design Deadline</span>
            <input
              id="edit-design-deadline"
              name="design_deadline"
              title="Design Deadline"
              aria-label="Design Deadline"
              type="date"
              value={formData.design_deadline}
              onChange={(e) => setFormData({ ...formData, design_deadline: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
            />
          </label>
        </div>

          {/* Notes */}
        <div>
          <label htmlFor="edit-design-notes" className="block text-sm font-medium text-gray-700">
            <span className="mb-2 block">Notes</span>
            <textarea
              id="edit-design-notes"
              name="design_notes"
              title="Design Notes"
              aria-label="Design Notes"
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
              rows={4}
              placeholder="Any special requirements or notes..."
            />
          </label>
        </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6ba8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
    </Modal>
  )
}
