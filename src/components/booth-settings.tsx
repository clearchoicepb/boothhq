'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Save, X, ChevronUp, ChevronDown } from 'lucide-react'

interface BoothType {
  id: string
  name: string
  display_name: string
  description: string | null
  default_required_items: Record<string, number>
  is_active: boolean
  sort_order: number
}

interface EquipmentType {
  id: string
  name: string
  display_name: string
  description: string | null
  icon: string | null
  category: string | null
  is_active: boolean
  sort_order: number
}

export function BoothSettings() {
  const [boothTypes, setBoothTypes] = useState<BoothType[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBoothType, setEditingBoothType] = useState<BoothType | null>(null)
  const [editingEquipmentType, setEditingEquipmentType] = useState<EquipmentType | null>(null)
  const [isAddingBoothType, setIsAddingBoothType] = useState(false)
  const [isAddingEquipmentType, setIsAddingEquipmentType] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [boothTypesRes, equipmentTypesRes] = await Promise.all([
        fetch('/api/booth-types'),
        fetch('/api/equipment-types')
      ])

      if (boothTypesRes.ok) {
        const data = await boothTypesRes.json()
        setBoothTypes(data)
      }

      if (equipmentTypesRes.ok) {
        const data = await equipmentTypesRes.json()
        setEquipmentTypes(data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveBoothType = async (boothType: Partial<BoothType>) => {
    try {
      const method = boothType.id ? 'PUT' : 'POST'
      const url = boothType.id ? `/api/booth-types/${boothType.id}` : '/api/booth-types'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boothType)
      })

      if (response.ok) {
        await fetchData()
        setEditingBoothType(null)
        setIsAddingBoothType(false)
      }
    } catch (error) {
      console.error('Error saving booth type:', error)
    }
  }

  const saveEquipmentType = async (equipmentType: Partial<EquipmentType>) => {
    try {
      const method = equipmentType.id ? 'PUT' : 'POST'
      const url = equipmentType.id ? `/api/equipment-types/${equipmentType.id}` : '/api/equipment-types'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(equipmentType)
      })

      if (response.ok) {
        await fetchData()
        setEditingEquipmentType(null)
        setIsAddingEquipmentType(false)
      }
    } catch (error) {
      console.error('Error saving equipment type:', error)
    }
  }

  const deleteBoothType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booth type?')) return

    try {
      const response = await fetch(`/api/booth-types/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error deleting booth type:', error)
    }
  }

  const deleteEquipmentType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment type?')) return

    try {
      const response = await fetch(`/api/equipment-types/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error deleting equipment type:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="space-y-8">
      {/* Booth Types Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Booth Types</h3>
            <p className="text-sm text-gray-600 mt-1">
              Define custom booth configurations for your business
            </p>
          </div>
          <Button onClick={() => setIsAddingBoothType(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Booth Type
          </Button>
        </div>

        {isAddingBoothType && (
          <BoothTypeForm
            onSave={saveBoothType}
            onCancel={() => setIsAddingBoothType(false)}
          />
        )}

        <div className="space-y-3">
          {boothTypes.map((boothType) => (
            <div key={boothType.id} className="border rounded-lg p-4">
              {editingBoothType?.id === boothType.id ? (
                <BoothTypeForm
                  boothType={editingBoothType}
                  onSave={saveBoothType}
                  onCancel={() => setEditingBoothType(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{boothType.display_name}</h4>
                      <span className="text-xs text-gray-500 font-mono">{boothType.name}</span>
                      {!boothType.is_active && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    {boothType.description && (
                      <p className="text-sm text-gray-600 mb-2">{boothType.description}</p>
                    )}
                    <div className="text-xs text-gray-500">
                      Default items: {Object.keys(boothType.default_required_items || {}).length} types
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingBoothType(boothType)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteBoothType(boothType.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Types Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Equipment Types</h3>
            <p className="text-sm text-gray-600 mt-1">
              Define custom equipment categories
            </p>
          </div>
          <Button onClick={() => setIsAddingEquipmentType(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment Type
          </Button>
        </div>

        {isAddingEquipmentType && (
          <EquipmentTypeForm
            onSave={saveEquipmentType}
            onCancel={() => setIsAddingEquipmentType(false)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {equipmentTypes.map((equipmentType) => (
            <div key={equipmentType.id} className="border rounded-lg p-4">
              {editingEquipmentType?.id === equipmentType.id ? (
                <EquipmentTypeForm
                  equipmentType={editingEquipmentType}
                  onSave={saveEquipmentType}
                  onCancel={() => setEditingEquipmentType(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-gray-900">{equipmentType.display_name}</h4>
                      {!equipmentType.is_active && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>ID: <span className="font-mono">{equipmentType.name}</span></div>
                      {equipmentType.category && (
                        <div>Category: <span className="capitalize">{equipmentType.category}</span></div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingEquipmentType(equipmentType)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteEquipmentType(equipmentType.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BoothTypeForm({
  boothType,
  onSave,
  onCancel
}: {
  boothType?: BoothType
  onSave: (data: Partial<BoothType>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: boothType?.name || '',
    display_name: boothType?.display_name || '',
    description: boothType?.description || '',
    is_active: boothType?.is_active ?? true
  })

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
            className="w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., premium"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., Premium"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onSave({ ...boothType, ...formData })}
          size="sm"
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  )
}

function EquipmentTypeForm({
  equipmentType,
  onSave,
  onCancel
}: {
  equipmentType?: EquipmentType
  onSave: (data: Partial<EquipmentType>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: equipmentType?.name || '',
    display_name: equipmentType?.display_name || '',
    description: equipmentType?.description || '',
    category: equipmentType?.category || 'equipment',
    is_active: equipmentType?.is_active ?? true
  })

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-3 md:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
            className="w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., ring_light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm"
            placeholder="e.g., Ring Light"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="core">Core</option>
            <option value="equipment">Equipment</option>
            <option value="decoration">Decoration</option>
            <option value="accessory">Accessory</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="flex items-center pt-6">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onSave({ ...equipmentType, ...formData })}
          size="sm"
        >
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  )
}
