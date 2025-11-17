'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  Clock,
  Truck,
  Package
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface DesignItemType {
  id?: string
  name: string
  description: string
  type: 'digital' | 'physical'
  due_date_days: number
  urgent_threshold_days: number
  missed_deadline_days: number
  is_auto_added: boolean
  is_active: boolean
  display_order: number
}

export default function DesignSettingsPage() {
  const { tenant } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [designTypes, setDesignTypes] = useState<DesignItemType[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const [designStatuses, setDesignStatuses] = useState<any[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(true)
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [showAddStatusForm, setShowAddStatusForm] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  const emptyType: DesignItemType = {
    name: '',
    description: '',
    type: 'digital',
    due_date_days: 14,
    urgent_threshold_days: 7,
    missed_deadline_days: 3,
    is_auto_added: false,
    is_active: true,
    display_order: 0
  }

  const [newType, setNewType] = useState<DesignItemType>(emptyType)

  useEffect(() => {
    fetchDesignTypes()
    fetchDesignStatuses()
  }, [])

  const fetchDesignTypes = async () => {
    try {
      const res = await fetch('/api/design/types')
      const data = await res.json()
      setDesignTypes(data.types || [])
    } catch (error) {
      console.error('Error fetching design types:', error)
      toast.error('Failed to load design types')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveType = async (type: DesignItemType) => {
    setSaving(true)
    try {
      const url = type.id ? `/api/design/types/${type.id}` : '/api/design/types'
      const method = type.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type)
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(type.id ? 'Design type updated' : 'Design type created')
      setShowAddForm(false)
      setEditingId(null)
      setNewType(emptyType)
      fetchDesignTypes()
    } catch (error) {
      toast.error('Failed to save design type')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure? This will not delete existing design items, but they will become unlinked.')) return

    try {
      const res = await fetch(`/api/design/types/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Design type deleted')
      fetchDesignTypes()
    } catch (error) {
      toast.error('Failed to delete design type')
    }
  }

  const handleToggleActive = async (type: DesignItemType) => {
    await handleSaveType({ ...type, is_active: !type.is_active })
  }

  const fetchDesignStatuses = async () => {
    try {
      const res = await fetch('/api/design/statuses')
      const data = await res.json()
      setDesignStatuses(data.statuses || [])
    } catch (error) {
      console.error('Error fetching design statuses:', error)
      toast.error('Failed to load design statuses')
    } finally {
      setLoadingStatuses(false)
    }
  }

  const handleSaveStatus = async (status: any) => {
    setSavingStatus(true)
    try {
      const url = status.id ? `/api/design/statuses/${status.id}` : '/api/design/statuses'
      const method = status.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status)
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(status.id ? 'Status updated' : 'Status created')
      setShowAddStatusForm(false)
      setEditingStatusId(null)
      fetchDesignStatuses()
    } catch (error) {
      toast.error('Failed to save status')
    } finally {
      setSavingStatus(false)
    }
  }

  const handleDeleteStatus = async (id: string) => {
    if (!confirm('Are you sure? This may affect existing design items using this status.')) return

    try {
      const res = await fetch(`/api/design/statuses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Status deleted')
      fetchDesignStatuses()
    } catch (error) {
      toast.error('Failed to delete status')
    }
  }

  const handleToggleStatusActive = async (status: any) => {
    await handleSaveStatus({ ...status, is_active: !status.is_active })
  }

  const handleToggleStatusCompleted = async (status: any) => {
    await handleSaveStatus({ ...status, is_completed: !status.is_completed })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/${tenant}/settings`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Design Settings</h1>
              <p className="text-gray-600 mt-1">
                Configure design item types, deadlines, and workflow preferences
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6ba8] transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Design Type
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
            <h3 className="text-lg font-semibold mb-4">Add New Design Type</h3>
            <DesignTypeForm
              type={newType}
              onChange={setNewType}
              onSave={() => handleSaveType(newType)}
              onCancel={() => {
                setShowAddForm(false)
                setNewType(emptyType)
              }}
              saving={saving}
            />
          </div>
        )}

        {/* Design Types List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Design Item Types</h2>
            <p className="text-sm text-gray-600 mt-1">
              {designTypes.length} type{designTypes.length !== 1 ? 's' : ''} configured
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto"></div>
            </div>
          ) : designTypes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No design types configured yet.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Create your first design type
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {designTypes.map(type => (
                <div key={type.id} className={`p-3 ${!type.is_active ? 'bg-gray-50' : ''}`}>
                  {editingId === type.id ? (
                    <DesignTypeForm
                      type={type}
                      onChange={(updated) => {
                        setDesignTypes(designTypes.map(t => t.id === type.id ? updated : t))
                      }}
                      onSave={() => handleSaveType(type)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900">{type.name}</h3>

                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            type.type === 'physical'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {type.type === 'physical' ? '📦 Physical' : '💻 Digital'}
                          </span>

                          {type.is_auto_added && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              Auto-added
                            </span>
                          )}

                          {!type.is_active && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </div>

                        {type.description && (
                          <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                        )}

                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="flex items-center text-gray-700">
                            <Clock className="h-3 w-3 mr-1.5 text-green-600" />
                            <div>
                              <p className="font-medium">{type.due_date_days} days</p>
                              <p className="text-[10px] text-gray-500">Due date</p>
                            </div>
                          </div>

                          <div className="flex items-center text-gray-700">
                            <Clock className="h-3 w-3 mr-1.5 text-orange-600" />
                            <div>
                              <p className="font-medium">{type.urgent_threshold_days} days</p>
                              <p className="text-[10px] text-gray-500">Urgent</p>
                            </div>
                          </div>

                          <div className="flex items-center text-gray-700">
                            <Clock className="h-3 w-3 mr-1.5 text-red-600" />
                            <div>
                              <p className="font-medium">{type.missed_deadline_days} days</p>
                              <p className="text-[10px] text-gray-500">Missed</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggleActive(type)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            type.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {type.is_active ? 'Active' : 'Inactive'}
                        </button>

                        <button
                          onClick={() => setEditingId(type.id!)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteType(type.id!)}
                          className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Design Statuses */}
        <div className="mt-8 bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Design Statuses</h2>
              <p className="text-sm text-gray-600 mt-1">
                {designStatuses.length} status{designStatuses.length !== 1 ? 'es' : ''} configured
              </p>
            </div>
            <button
              onClick={() => setShowAddStatusForm(true)}
              className="inline-flex items-center px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6ba8] transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Status
            </button>
          </div>

          {loadingStatuses ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto"></div>
            </div>
          ) : designStatuses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No statuses configured yet.</p>
              <button
                onClick={() => setShowAddStatusForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Create your first status
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {designStatuses
                .sort((a, b) => a.display_order - b.display_order)
                .map(status => (
                  <div key={status.id} className={`p-3 flex items-center justify-between ${!status.is_active ? 'bg-gray-50' : ''}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-3 h-3 rounded-full ${getColorClass(status.color)}`}></div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{status.name}</h3>
                        {!status.is_active && (
                          <span className="text-xs text-gray-500">Inactive</span>
                        )}
                      </div>
                      {status.is_default && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Default
                        </span>
                      )}
                      {status.is_completed && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          Completion Status
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatusActive(status)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          status.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {status.is_active ? 'Active' : 'Inactive'}
                      </button>

                      <button
                        onClick={() => handleToggleStatusCompleted(status)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          status.is_completed
                            ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={status.is_completed ? 'Mark as non-completion status' : 'Mark as completion status'}
                      >
                        {status.is_completed ? 'Complete' : 'Incomplete'}
                      </button>

                      <button
                        onClick={() => handleDeleteStatus(status.id)}
                        className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {showAddStatusForm && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Add New Status</h3>
              <AddStatusForm
                onSave={handleSaveStatus}
                onCancel={() => setShowAddStatusForm(false)}
                saving={savingStatus}
              />
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">How Design Types Work</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Auto-added types</strong> are automatically added to every new event</li>
            <li>• <strong>Physical items</strong> typically need more lead time due to vendor production</li>
            <li>• <strong>Digital items</strong> can usually be completed faster</li>
            <li>• <strong>Due Date:</strong> When design must be completed by (days before event)</li>
            <li>• <strong>Urgent Threshold:</strong> Missed due date but still possible (days before event)</li>
            <li>• <strong>Missed Deadline:</strong> Too late to offer to client (days before event)</li>
            <li>• All deadlines are calculated based on the event date</li>
          </ul>
        </div>
    </div>
  )
}

// Design Type Form Component
function DesignTypeForm({
  type,
  onChange,
  onSave,
  onCancel,
  saving
}: {
  type: DesignItemType
  onChange: (type: DesignItemType) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={type.name}
            onChange={(e) => onChange({ ...type, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
            placeholder="Photo Strip Design"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            value={type.type}
            onChange={(e) => {
              const newType = e.target.value as 'digital' | 'physical'
              onChange({
                ...type,
                type: newType,
                // Set recommended defaults based on type
                due_date_days: newType === 'physical' ? 21 : 14,
                urgent_threshold_days: newType === 'physical' ? 14 : 7,
                missed_deadline_days: newType === 'physical' ? 13 : 3
              })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
          >
            <option value="digital">💻 Digital</option>
            <option value="physical">📦 Physical</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={type.description}
          onChange={(e) => onChange({ ...type, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
          rows={2}
          placeholder="Brief description of this design item"
        />
      </div>

      {/* Timeline Settings */}
      <div>
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-900">
            <strong>Event-based deadlines:</strong> All dates are calculated as days <em>before</em> the event date.
            {type.type === 'physical'
              ? ' Example for Backdrop (21/14/13): Due 21 days before event, Urgent from day 20-14, Missed from day 13-1.'
              : ' Example for Digital Item (14/7/3): Due 14 days before event, Urgent from day 13-7, Missed from day 6-1.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date (days before event) *
            </label>
            <input
              type="number"
              min="1"
              value={type.due_date_days}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                onChange({ ...type, due_date_days: value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
              placeholder="21"
            />
            <p className="text-xs text-gray-500 mt-1">When design must be completed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgent Threshold (days before event) *
            </label>
            <input
              type="number"
              min="1"
              value={type.urgent_threshold_days}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                onChange({ ...type, urgent_threshold_days: value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
              placeholder="14"
            />
            <p className="text-xs text-gray-500 mt-1">Missed due date, needs urgent attention</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Missed Deadline (days before event) *
            </label>
            <input
              type="number"
              min="1"
              value={type.missed_deadline_days}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                onChange({ ...type, missed_deadline_days: value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
              placeholder="13"
            />
            <p className="text-xs text-gray-500 mt-1">Too late to offer to client</p>
          </div>
        </div>

        {/* Validation Warning */}
        {(type.due_date_days <= type.urgent_threshold_days ||
          type.urgent_threshold_days <= type.missed_deadline_days ||
          type.missed_deadline_days <= 0) && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ Invalid configuration: Due Date must be greater than Urgent Threshold, which must be greater than Missed Deadline, and all must be positive numbers.
            </p>
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="flex gap-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={type.is_auto_added}
            onChange={(e) => onChange({ ...type, is_auto_added: e.target.checked })}
            className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4] mr-2"
          />
          <span className="text-sm text-gray-700">Auto-add to every event</span>
        </label>

        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={type.is_active}
            onChange={(e) => onChange({ ...type, is_active: e.target.checked })}
            className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4] mr-2"
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onSave}
          disabled={saving || !type.name || type.due_date_days <= type.urgent_threshold_days || type.urgent_threshold_days <= type.missed_deadline_days}
          className="px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6ba8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Helper function to get color class
function getColorClass(color: string) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }
  return colorMap[color] || 'bg-gray-500'
}

// Add Status Form Component
function AddStatusForm({
  onSave,
  onCancel,
  saving
}: {
  onSave: (status: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('gray')
  const [isCompleted, setIsCompleted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    onSave({
      name: name.trim(),
      slug,
      color,
      is_active: true,
      is_default: false,
      is_completed: isCompleted,
      display_order: 999
    })
  }

  const colorOptions = [
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
            placeholder="e.g., Awaiting Materials"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
          >
            {colorOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {colorOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => setColor(option.value)}
            className={`w-8 h-8 rounded-full ${option.class} ${
              color === option.value ? 'ring-2 ring-offset-2 ring-[#347dc4]' : ''
            }`}
            title={option.label}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_completed"
          checked={isCompleted}
          onChange={(e) => setIsCompleted(e.target.checked)}
          className="w-4 h-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
        />
        <label htmlFor="is_completed" className="text-sm font-medium text-gray-700">
          This is a completion status
        </label>
        <span className="text-xs text-gray-500 ml-1">
          (Items with this status will be marked as complete in dashboard)
        </span>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6ba8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
