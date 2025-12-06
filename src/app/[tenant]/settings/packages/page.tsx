'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Package, Plus, Edit2, Trash2, ChevronLeft } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('packages')

interface PackageItem {
  id: string
  name: string
  description: string | null
  base_price: number
  category: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export default function PackagesPage() {
  const params = useParams()
  const tenant = params?.tenant as string
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    category: 'private_events',
    is_active: true,
  })

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/packages')
      if (response.ok) {
        const data = await response.json()
        setPackages(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching packages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages'
    const method = editingPackage ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          base_price: parseFloat(formData.base_price),
          category: formData.category,
          is_active: formData.is_active,
        }),
      })

      if (response.ok) {
        fetchPackages()
        setIsModalOpen(false)
        resetForm()
      }
    } catch (error) {
      log.error({ error }, 'Error saving package')
    }
  }

  const handleEdit = (pkg: PackageItem) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      base_price: pkg.base_price.toString(),
      category: pkg.category || 'private_events',
      is_active: pkg.is_active,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) {
      return
    }

    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchPackages()
      }
    } catch (error) {
      log.error({ error }, 'Error deleting package')
    }
  }

  const resetForm = () => {
    setEditingPackage(null)
    setFormData({
      name: '',
      description: '',
      base_price: '',
      category: 'private_events',
      is_active: true,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${tenant}/settings`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="h-8 w-8 mr-3 text-[#347dc4]" />
                Packages
              </h1>
              <p className="text-gray-600 mt-2">
                Manage service packages and pricing for your quotes
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </Button>
          </div>
        </div>

        {/* Packages List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading packages...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No packages yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first package to start building quotes
            </p>
            <Button
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                    {pkg.category && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {pkg.category.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(pkg)}
                      className="p-1 text-gray-400 hover:text-[#347dc4] rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {pkg.description && (
                  <div
                    className="text-sm text-gray-600 mb-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: pkg.description }}
                  />
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-2xl font-bold text-gray-900">
                    ${pkg.base_price.toFixed(2)}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      pkg.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            resetForm()
          }}
          title={editingPackage ? 'Edit Package' : 'New Package'}
          className="sm:max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Package Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    placeholder="Describe the package details..."
                    minHeight="120px"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                  >
                    <option value="private_events">Private Events</option>
                    <option value="corporate_activations">Corporate Activations</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-[#347dc4] focus:ring-[#347dc4] border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Active (available for selection)
                  </label>
                </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#347dc4] hover:bg-[#2c6aa3]">
                {editingPackage ? 'Save Changes' : 'Create Package'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
