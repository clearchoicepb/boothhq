'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface EditDesignItemModalProps {
  eventId: string
  designItem: any
  onClose: () => void
  onSuccess: () => void
}

export function EditDesignItemModal({ eventId, designItem, onClose, onSuccess }: EditDesignItemModalProps) {
  const [users, setUsers] = useState([])
  const [designStatuses, setDesignStatuses] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    status: designItem.status,
    assigned_designer_id: designItem.assigned_designer?.id || '',
    internal_notes: designItem.internal_notes || '',
    design_deadline: designItem.design_deadline
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
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchDesignStatuses = async () => {
    try {
      const res = await fetch('/api/design/statuses')
      const data = await res.json()
      setDesignStatuses(data.statuses || [])
    } catch (error) {
      console.error('Error fetching design statuses:', error)
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
    } catch (error) {
      toast.error('Failed to update design item')
    } finally {
      setLoading(false)
    }
  }

  const itemName = designItem.item_name || designItem.design_item_type?.name || 'Design Item'

  // Filter to only show active statuses
  const activeStatuses = designStatuses.filter((status: any) => status.is_active)

  // Check if we're in browser (not SSR)
  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/50 transition-opacity flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full relative z-10">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Edit: {itemName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
            >
              {activeStatuses.map((status: any) => (
                <option key={status.id} value={status.slug}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Designer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Designer
            </label>
            <select
              value={formData.assigned_designer_id}
              onChange={(e) => setFormData({ ...formData, assigned_designer_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
            >
              <option value="">Unassigned</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Design Deadline
            </label>
            <input
              type="date"
              value={formData.design_deadline}
              onChange={(e) => setFormData({ ...formData, design_deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
              rows={4}
              placeholder="Any special requirements or notes..."
            />
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
      </div>
    </div>,
    document.body
  )
}
