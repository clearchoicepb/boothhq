'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/modal'
import { useUsers } from '@/hooks/useUsers'
import { createLogger } from '@/lib/logger'

const log = createLogger('events')

interface DesignTypeOption {
  id: string
  name: string
  type: string
  is_active: boolean
}

interface AddDesignItemModalProps {
  eventId: string
  eventDate: string
  onClose: () => void
  onSuccess: () => void
  isOpen?: boolean
}

export function AddDesignItemModal({ eventId, eventDate, onClose, onSuccess, isOpen = true }: AddDesignItemModalProps) {
  const { data: users = [] } = useUsers()
  const [designTypes, setDesignTypes] = useState<DesignTypeOption[]>([])
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
  }, [])

  const fetchDesignTypes = async () => {
    try {
      const res = await fetch('/api/design/types')
      const data = (await res.json()) as { types?: DesignTypeOption[] }
      setDesignTypes(data.types?.filter(Boolean) ?? [])
    } catch (_error) {
      log.error({ _error }, 'Error fetching design types')
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
    } catch {
      toast.error('Failed to create design item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Design Item"
      className="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
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
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-2 block">Design Type *</span>
              <select
                name="design_item_type_id"
                title="Design Type"
                value={formData.design_item_type_id}
                onChange={(e) => setFormData({ ...formData, design_item_type_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
                required
              >
                <option value="">Select a design type...</option>
                {designTypes
                  .filter((type) => type.is_active)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.type === 'physical' ? 'Physical' : 'Digital'})
                    </option>
                  ))}
              </select>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Deadline will be calculated automatically based on the type&apos;s settings
            </p>
          </div>
        )}

          {/* Custom Mode */}
          {mode === 'custom' && (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-2 block">Item Name *</span>
                <input
                  name="custom_name"
                  title="Item Name"
                  type="text"
                  value={formData.custom_name}
                  onChange={(e) => setFormData({ ...formData, custom_name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
                  placeholder="e.g., Special Event Signage"
                  required
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-2 block">Type *</span>
                <select
                  name="custom_type"
                  title="Custom Type"
                  value={formData.custom_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    custom_type: e.target.value,
                    custom_production_days: e.target.value === 'digital' ? 0 : formData.custom_production_days,
                    custom_shipping_days: e.target.value === 'digital' ? 0 : formData.custom_shipping_days
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
                >
                  <option value="digital">💻 Digital</option>
                  <option value="physical">📦 Physical</option>
                </select>
              </label>
            </div>

              <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <span className="mb-2 block">Design Days *</span>
                  <input
                    name="custom_design_days"
                    title="Design Days"
                    type="number"
                    min="0"
                    value={formData.custom_design_days}
                    onChange={(e) => setFormData({ ...formData, custom_design_days: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
                    required
                  />
                </label>
              </div>

                {formData.custom_type === 'physical' && (
                  <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="mb-2 block">Production Days</span>
                      <input
                        name="custom_production_days"
                        title="Production Days"
                        type="number"
                        min="0"
                        value={formData.custom_production_days}
                        onChange={(e) => setFormData({ ...formData, custom_production_days: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <span className="mb-2 block">Shipping Days</span>
                      <input
                        name="custom_shipping_days"
                        title="Shipping Days"
                        type="number"
                        min="0"
                        value={formData.custom_shipping_days}
                        onChange={(e) => setFormData({ ...formData, custom_shipping_days: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
                      />
                    </label>
                  </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Assigned Designer */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-2 block">Assign to Designer</span>
            <select
              name="assigned_designer_id"
              title="Assigned Designer"
              value={formData.assigned_designer_id}
              onChange={(e) => setFormData({ ...formData, assigned_designer_id: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
            >
              <option value="">Unassigned</option>
              {users.map((user: { id: string; first_name?: string; last_name?: string; email: string }) => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                </option>
              ))}
            </select>
          </label>
        </div>

          {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-2 block">Notes</span>
            <textarea
              name="design_item_notes"
              title="Design Item Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#347dc4] focus:ring-2 focus:ring-[#347dc4]"
              rows={3}
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
    </Modal>
  )
}
