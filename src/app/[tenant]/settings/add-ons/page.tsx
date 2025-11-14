'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Plus as PlusIcon, Edit2, Trash2, ChevronLeft } from 'lucide-react'

interface AddOn {
  id: string
  name: string
  description: string | null
  price: number
  unit: string
  category: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export default function AddOnsPage() {
  const params = useParams()
  const tenant = params?.tenant as string
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'each',
    category: 'props',
    is_active: true,
  })

  useEffect(() => {
    fetchAddOns()
  }, [])

  const fetchAddOns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/add-ons')
      if (response.ok) {
        const data = await response.json()
        setAddOns(data)
      }
    } catch (error) {
      console.error('Error fetching add-ons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const url = editingAddOn ? `/api/add-ons/${editingAddOn.id}` : '/api/add-ons'
    const method = editingAddOn ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          unit: formData.unit,
          category: formData.category,
          is_active: formData.is_active,
        }),
      })

      if (response.ok) {
        fetchAddOns()
        setIsModalOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving add-on:', error)
    }
  }

  const handleEdit = (addOn: AddOn) => {
    setEditingAddOn(addOn)
    setFormData({
      name: addOn.name,
      description: addOn.description || '',
      price: addOn.price.toString(),
      unit: addOn.unit,
      category: addOn.category || 'props',
      is_active: addOn.is_active,
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) {
      return
    }

    try {
      const response = await fetch(`/api/add-ons/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAddOns()
      }
    } catch (error) {
      console.error('Error deleting add-on:', error)
    }
  }

  const resetForm = () => {
    setEditingAddOn(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      unit: 'each',
      category: 'props',
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
                <PlusIcon className="h-8 w-8 mr-3 text-[#347dc4]" />
                Add-ons
              </h1>
              <p className="text-gray-600 mt-2">
                Manage add-on items and services for your quotes
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Add-on
            </Button>
          </div>
        </div>

        {/* Add-ons List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading add-ons...</p>
          </div>
        ) : addOns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <PlusIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No add-ons yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first add-on to enhance your quotes
            </p>
            <Button
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="bg-[#347dc4] hover:bg-[#2c6aa3]"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Add-on
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addOns.map((addOn) => (
              <div
                key={addOn.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{addOn.name}</h3>
                    {addOn.category && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        {addOn.category.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(addOn)}
                      className="p-1 text-gray-400 hover:text-[#347dc4] rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(addOn.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {addOn.description && (
                  <div
                    className="text-sm text-gray-600 mb-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: addOn.description }}
                  />
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">
                      ${addOn.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">/ {addOn.unit}</span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      addOn.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {addOn.is_active ? 'Active' : 'Inactive'}
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
          title={editingAddOn ? 'Edit Add-on' : 'New Add-on'}
          className="sm:max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add-on Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                    placeholder="e.g., Extra Hour, Props Package"
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
                    placeholder="Describe the add-on details..."
                    minHeight="120px"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#347dc4] text-gray-900"
                    >
                      <option value="each">Each</option>
                      <option value="hour">Hour</option>
                      <option value="day">Day</option>
                      <option value="set">Set</option>
                      <option value="person">Person</option>
                    </select>
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
                    <option value="props">Props</option>
                    <option value="equipment">Equipment</option>
                    <option value="staffing">Staffing</option>
                    <option value="printing">Printing</option>
                    <option value="backdrops">Backdrops</option>
                    <option value="other">Other</option>
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
                {editingAddOn ? 'Save Changes' : 'Create Add-on'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
