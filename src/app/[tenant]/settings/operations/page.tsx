'use client'

/**
 * Operations Settings Page
 *
 * Mirrors the Design Settings page structure
 * Configure operations item types, deadlines, and workflow preferences
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  Clock,
  Briefcase,
  Users,
  Truck,
  MapPin,
  Wrench
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('operations')

interface OperationsItemType {
  id?: string
  name: string
  description: string
  category: 'equipment' | 'staffing' | 'logistics' | 'venue' | 'setup' | 'other'
  due_date_days: number
  urgent_threshold_days: number
  missed_deadline_days: number
  is_auto_added: boolean
  is_active: boolean
  display_order: number
}

const CATEGORY_OPTIONS = [
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'staffing', label: 'Staffing', icon: Users },
  { value: 'logistics', label: 'Logistics', icon: Truck },
  { value: 'venue', label: 'Venue', icon: MapPin },
  { value: 'setup', label: 'Setup', icon: Briefcase },
  { value: 'other', label: 'Other', icon: Briefcase },
]

export default function OperationsSettingsPage() {
  const { tenant } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [opsTypes, setOpsTypes] = useState<OperationsItemType[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const emptyType: OperationsItemType = {
    name: '',
    description: '',
    category: 'logistics',
    due_date_days: 7,
    urgent_threshold_days: 3,
    missed_deadline_days: 1,
    is_auto_added: false,
    is_active: true,
    display_order: 0
  }

  const [newType, setNewType] = useState<OperationsItemType>(emptyType)

  useEffect(() => {
    fetchOpsTypes()
  }, [])

  const fetchOpsTypes = async () => {
    try {
      const res = await fetch('/api/operations/types')
      const data = await res.json()
      setOpsTypes(data.types || [])
    } catch (error) {
      log.error({ error }, 'Error fetching operations types')
      toast.error('Failed to load operations types')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveType = async (type: OperationsItemType) => {
    setSaving(true)
    try {
      const url = type.id ? `/api/operations/types/${type.id}` : '/api/operations/types'
      const method = type.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type)
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(type.id ? 'Operations type updated' : 'Operations type created')
      setShowAddForm(false)
      setEditingId(null)
      setNewType(emptyType)
      fetchOpsTypes()
    } catch (error) {
      toast.error('Failed to save operations type')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure? This will not delete existing operations items, but they will become unlinked.')) return

    try {
      const res = await fetch(`/api/operations/types/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      toast.success('Operations type deleted')
      fetchOpsTypes()
    } catch (error) {
      toast.error('Failed to delete operations type')
    }
  }

  const handleToggleActive = async (type: OperationsItemType) => {
    await handleSaveType({ ...type, is_active: !type.is_active })
  }

  const getCategoryInfo = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[5]
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
            <h1 className="text-3xl font-bold text-gray-900">Operations Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure operations item types, deadlines, and workflow preferences
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Operations Type
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-amber-200">
          <h3 className="text-lg font-semibold mb-4">Add New Operations Type</h3>
          <OperationsTypeForm
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

      {/* Operations Types List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Operations Item Types</h2>
          <p className="text-sm text-gray-600 mt-1">
            {opsTypes.length} type{opsTypes.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        ) : opsTypes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No operations types configured yet.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-amber-600 hover:text-amber-800"
            >
              Create your first operations type
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {opsTypes.map(type => (
              <div key={type.id} className={`p-3 ${!type.is_active ? 'bg-gray-50' : ''}`}>
                {editingId === type.id ? (
                  <OperationsTypeForm
                    type={type}
                    onChange={(updated) => {
                      setOpsTypes(opsTypes.map(t => t.id === type.id ? updated : t))
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

                        <span className={`px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800`}>
                          {getCategoryInfo(type.category).label}
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

      {/* Help Text */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">How Operations Types Work</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• <strong>Default types</strong> are automatically created on first visit - edit or delete them as needed</li>
          <li>• <strong>Auto-added types</strong> are automatically added to every new event</li>
          <li>• <strong>Categories</strong> help organize tasks: Equipment, Staffing, Logistics, Venue, Setup</li>
          <li>• <strong>Due Date:</strong> When task must be completed by (days before event)</li>
          <li>• <strong>Urgent Threshold:</strong> Missed due date but still possible (days before event)</li>
          <li>• <strong>Missed Deadline:</strong> Too late to complete (days before event)</li>
          <li>• All deadlines are calculated based on the event date</li>
          <li>• Use <strong>Workflows</strong> to automatically create operations items when events are created</li>
        </ul>
      </div>
    </div>
  )
}

// Operations Type Form Component
function OperationsTypeForm({
  type,
  onChange,
  onSave,
  onCancel,
  saving
}: {
  type: OperationsItemType
  onChange: (type: OperationsItemType) => void
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Equipment Check"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={type.category}
            onChange={(e) => onChange({ ...type, category: e.target.value as OperationsItemType['category'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          rows={2}
          placeholder="Brief description of this operations item"
        />
      </div>

      {/* Timeline Settings */}
      <div>
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-900">
            <strong>Event-based deadlines:</strong> All dates are calculated as days <em>before</em> the event date.
            Example: Due 7 days before event, Urgent from day 6-3, Missed from day 2-0.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date (days before event) *
            </label>
            <input
              type="number"
              min="0"
              value={type.due_date_days}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0
                onChange({ ...type, due_date_days: value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="7"
            />
            <p className="text-xs text-gray-500 mt-1">When task must be completed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgent Threshold (days before event) *
            </label>
            <input
              type="number"
              min="0"
              value={type.urgent_threshold_days}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0
                onChange({ ...type, urgent_threshold_days: value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="3"
            />
            <p className="text-xs text-gray-500 mt-1">Missed due date, needs urgent attention</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Missed Deadline (days before event) *
            </label>
            <input
              type="number"
              min="0"
              value={type.missed_deadline_days}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0
                onChange({ ...type, missed_deadline_days: value })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">Too late to complete properly</p>
          </div>
        </div>

        {/* Validation Warning */}
        {(type.due_date_days <= type.urgent_threshold_days ||
          type.urgent_threshold_days <= type.missed_deadline_days) && type.due_date_days > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              ⚠️ Invalid configuration: Due Date must be greater than Urgent Threshold, which must be greater than Missed Deadline.
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
            className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 mr-2"
          />
          <span className="text-sm text-gray-700">Auto-add to every event</span>
        </label>

        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={type.is_active}
            onChange={(e) => onChange({ ...type, is_active: e.target.checked })}
            className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500 mr-2"
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onSave}
          disabled={saving || !type.name || (type.due_date_days > 0 && (type.due_date_days <= type.urgent_threshold_days || type.urgent_threshold_days <= type.missed_deadline_days))}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
