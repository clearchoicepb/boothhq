'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddDesignItemModalProps {
  eventId: string
  eventDate: string
  onClose: () => void
  onSuccess: () => void
}

export function AddDesignItemModal({ eventId, eventDate, onClose, onSuccess }: AddDesignItemModalProps) {
  const [designTypes, setDesignTypes] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'template' | 'custom'>('template')

  const [formData, setFormData] = useState({
    design_item_type_id: '',
    custom_name: '',
    custom_type: 'digital',
    custom_design_days: 7,
    custom_production_days: 0,
    custom_shipping_days: 0,
    assigned_designer_id: '',
    notes: ''
  })

  useEffect(() => {
    fetchDesignTypes()
    fetchUsers()
  }, [])

  const fetchDesignTypes = async () => {
    try {
      const res = await fetch('/api/design/types')
      const data = await res.json()
      setDesignTypes(data.types || [])
    } catch (error) {
      console.error('Error fetching design types:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'template' && !formData.design_item_type_id) {
      toast.error('Please select a design type')
      return
    }

    if (mode === 'custom' && !formData.custom_name) {
      toast.error('Please enter a name')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/events/${eventId}/design-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          event_date: eventDate,
          design_item_type_id: mode === 'template' ? formData.design_item_type_id : null,
          custom_name: mode === 'custom' ? formData.custom_name : null,
          custom_type: mode === 'custom' ? formData.custom_type : null
        })
      })

      if (!res.ok) throw new Error('Failed to create')

      toast.success('Design item created')
      onSuccess()
    } catch (error) {
      toast.error('Failed to create design item')
    } finally {
      setLoading(false)
    }
  }

  // Check if we're in browser (not SSR)
  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/50 transition-opacity flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Add Design Item</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Type
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMode('template')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  mode === 'template'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">Use Template</div>
                <div className="text-xs text-gray-600 mt-1">
                  Select from configured design types
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  mode === 'custom'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">Custom Item</div>
                <div className="text-xs text-gray-600 mt-1">
                  Create a one-time design item
                </div>
              </button>
            </div>
          </div>

          {/* Template Mode */}
          {mode === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design Type *
              </label>
              <select
                value={formData.design_item_type_id}
                onChange={(e) => setFormData({ ...formData, design_item_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                required
              >
                <option value="">Select a design type...</option>
                {designTypes
                  .filter((type: any) => type.is_active)
                  .map((type: any) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.type === 'physical' ? 'Physical' : 'Digital'})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Deadline will be calculated automatically based on the type&apos;s settings
              </p>
            </div>
          )}

          {/* Custom Mode */}
          {mode === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.custom_name}
                  onChange={(e) => setFormData({ ...formData, custom_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                  placeholder="e.g., Special Event Signage"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.custom_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    custom_type: e.target.value,
                    custom_production_days: e.target.value === 'digital' ? 0 : formData.custom_production_days,
                    custom_shipping_days: e.target.value === 'digital' ? 0 : formData.custom_shipping_days
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                >
                  <option value="digital">💻 Digital</option>
                  <option value="physical">📦 Physical</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Design Days *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.custom_design_days}
                    onChange={(e) => setFormData({ ...formData, custom_design_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                    required
                  />
                </div>

                {formData.custom_type === 'physical' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Production Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.custom_production_days}
                        onChange={(e) => setFormData({ ...formData, custom_production_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shipping Days
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.custom_shipping_days}
                        onChange={(e) => setFormData({ ...formData, custom_shipping_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Assigned Designer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Designer
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
              rows={3}
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
                  Creating...
                </>
              ) : (
                'Create Design Item'
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
