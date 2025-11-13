'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Modal } from '@/components/ui/modal'
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EventCategory {
  id: string
  name: string
  color: string
}

interface EventType {
  id: string
  name: string
  slug: string
  description: string | null
  event_category_id: string
  is_active: boolean
  is_system_default: boolean
  display_order: number
  event_categories: EventCategory
}

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingType, setEditingType] = useState<EventType | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchEventTypes()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/event-categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchEventTypes = async () => {
    try {
      const url = selectedCategory
        ? `/api/event-types?category_id=${selectedCategory}`
        : '/api/event-types'

      const res = await fetch(url)
      const data = await res.json()
      setEventTypes(data.eventTypes || [])
    } catch (error) {
      console.error('Error fetching event types:', error)
      toast.error('Failed to load event types')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (eventType: EventType) => {
    try {
      const res = await fetch(`/api/event-types/${eventType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !eventType.is_active })
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(eventType.is_active ? 'Type deactivated' : 'Type activated')
      fetchEventTypes()
    } catch (error) {
      toast.error('Failed to update event type')
    }
  }

  const handleDelete = async (eventType: EventType) => {
    if (eventType.is_system_default) {
      toast.error('Cannot delete system default types')
      return
    }

    if (!confirm(`Delete "${eventType.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/event-types/${eventType.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast.success('Event type deleted')
      fetchEventTypes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete event type')
    }
  }

  // Group types by category
  const groupedTypes = eventTypes.reduce((acc, type) => {
    const categoryName = type.event_categories.name
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(type)
    return acc
  }, {} as Record<string, EventType[]>)

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Tag className="h-8 w-8 mr-3 text-blue-600" />
              Event Types
            </h1>
            <p className="text-gray-600 mt-1">
              Manage specific event types within categories
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Event Type
          </button>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Event Types Grouped by Category */}
        {Object.entries(groupedTypes).map(([categoryName, types]) => (
          <div key={categoryName} className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: types[0].event_categories.color }}
              ></div>
              {categoryName}
            </h2>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Event Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {types.map((eventType) => (
                    <tr key={eventType.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{eventType.name}</p>
                          <p className="text-sm text-gray-500">{eventType.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {eventType.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {eventType.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {eventType.is_system_default ? (
                          <span className="text-blue-600 font-medium">System</span>
                        ) : (
                          <span className="text-gray-500">Custom</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingType(eventType)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(eventType)}
                          className={eventType.is_active ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'}
                        >
                          {eventType.is_active ? <XCircle className="h-4 w-4 inline" /> : <CheckCircle className="h-4 w-4 inline" />}
                        </button>
                        {!eventType.is_system_default && (
                          <button
                            onClick={() => handleDelete(eventType)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {eventTypes.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Tag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Event Types</h3>
            <p className="text-gray-600 mb-4">
              {selectedCategory ? 'No event types in this category' : 'Get started by adding your first event type'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Event Type
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Event Types</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Event Types are specific events within a category (Wedding, Conference, etc.)</li>
            <li>• System default types cannot be deleted, only deactivated</li>
            <li>• Event Types are used for package assignment and reporting</li>
            <li>• Each type must belong to a category</li>
          </ul>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingType) && (
        <EventTypeModal
          eventType={editingType}
          categories={categories}
          onClose={() => {
            setShowAddModal(false)
            setEditingType(null)
          }}
          onSuccess={() => {
            setShowAddModal(false)
            setEditingType(null)
            fetchEventTypes()
          }}
        />
      )}
    </AppLayout>
  )
}

// Event Type Modal Component
function EventTypeModal({ eventType, categories, onClose, onSuccess }: any) {
  const [name, setName] = useState(eventType?.name || '')
  const [description, setDescription] = useState(eventType?.description || '')
  const [categoryId, setCategoryId] = useState(eventType?.event_category_id || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId) {
      toast.error('Please select a category')
      return
    }

    setSaving(true)

    try {
      const url = eventType
        ? `/api/event-types/${eventType.id}`
        : '/api/event-types'

      const method = eventType ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          event_category_id: categoryId
        })
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(eventType ? 'Event type updated' : 'Event type created')
      onSuccess()
    } catch (error) {
      toast.error('Failed to save event type')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={eventType ? 'Edit Event Type' : 'Add Event Type'}
      className="sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a category...</option>
              {categories.filter((c: any) => c.is_active).map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Wedding"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of this event type..."
            />
          </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name || !categoryId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {eventType ? 'Update' : 'Create'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
