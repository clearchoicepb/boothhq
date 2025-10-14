'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import {
  Folder,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EventCategory {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string
  is_active: boolean
  is_system_default: boolean
  display_order: number
}

export default function EventCategoriesPage() {
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/event-categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (category: EventCategory) => {
    try {
      const res = await fetch(`/api/event-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !category.is_active })
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(category.is_active ? 'Category deactivated' : 'Category activated')
      fetchCategories()
    } catch (error) {
      toast.error('Failed to update category')
    }
  }

  const handleDelete = async (category: EventCategory) => {
    if (category.is_system_default) {
      toast.error('Cannot delete system default categories')
      return
    }

    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/event-categories/${category.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete')
      }

      toast.success('Category deleted')
      fetchCategories()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category')
    }
  }

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
              <Folder className="h-8 w-8 mr-3 text-purple-600" />
              Event Categories
            </h1>
            <p className="text-gray-600 mt-1">
              Manage workflow categories (Social vs Corporate events)
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Category
          </button>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
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
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-2 py-4">
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <p className="text-sm text-gray-500">{category.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {category.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {category.is_active ? (
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
                    {category.is_system_default ? (
                      <span className="text-purple-600 font-medium">System</span>
                    ) : (
                      <span className="text-gray-500">Custom</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(category)}
                      className={category.is_active ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'}
                    >
                      {category.is_active ? <XCircle className="h-4 w-4 inline" /> : <CheckCircle className="h-4 w-4 inline" />}
                    </button>
                    {!category.is_system_default && (
                      <button
                        onClick={() => handleDelete(category)}
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

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Event Categories</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Categories define workflow types (Social Events vs Corporate Events)</li>
            <li>• System default categories cannot be deleted, only deactivated</li>
            <li>• Each Event Type must belong to a category</li>
            <li>• Operations tasks will filter based on category</li>
          </ul>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowAddModal(false)
            setEditingCategory(null)
          }}
          onSuccess={() => {
            setShowAddModal(false)
            setEditingCategory(null)
            fetchCategories()
          }}
        />
      )}
    </AppLayout>
  )
}

// Category Modal Component
function CategoryModal({ category, onClose, onSuccess }: any) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [color, setColor] = useState(category?.color || '#6B7280')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = category
        ? `/api/event-categories/${category.id}`
        : '/api/event-categories'

      const method = category ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color })
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(category ? 'Category updated' : 'Category created')
      onSuccess()
    } catch (error) {
      toast.error('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {category ? 'Edit Category' : 'Add Category'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Social Event"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief description of this category..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="#6B7280"
              />
            </div>
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
              disabled={saving || !name}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {category ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
