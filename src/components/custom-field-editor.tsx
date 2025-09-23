'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Save, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomField {
  id: string
  name: string
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'textarea' | 'checkbox'
  required: boolean
  options?: string[] // For select fields
  placeholder?: string
  description?: string
}

interface CustomFieldEditorProps {
  fields: CustomField[]
  onFieldsChange: (fields: CustomField[]) => void
  recordType: 'leads' | 'contacts' | 'accounts' | 'opportunities'
}

export function CustomFieldEditor({ fields, onFieldsChange, recordType }: CustomFieldEditorProps) {
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newField, setNewField] = useState<Partial<CustomField>>({
    name: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
    description: ''
  })

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'checkbox', label: 'Checkbox' }
  ]

  const handleAddField = () => {
    if (!newField.name?.trim()) return

    const field: CustomField = {
      id: Date.now().toString(),
      name: newField.name,
      type: newField.type as CustomField['type'],
      required: newField.required || false,
      options: newField.type === 'select' ? newField.options || [] : undefined,
      placeholder: newField.placeholder || '',
      description: newField.description || ''
    }

    onFieldsChange([...fields, field])
    setNewField({
      name: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
      description: ''
    })
    setShowAddForm(false)
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setNewField(field)
  }

  const handleSaveEdit = () => {
    if (!editingField || !newField.name?.trim()) return

    const updatedField: CustomField = {
      ...editingField,
      name: newField.name,
      type: newField.type as CustomField['type'],
      required: newField.required || false,
      options: newField.type === 'select' ? newField.options || [] : undefined,
      placeholder: newField.placeholder || '',
      description: newField.description || ''
    }

    onFieldsChange(fields.map(f => f.id === editingField.id ? updatedField : f))
    setEditingField(null)
    setNewField({
      name: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
      description: ''
    })
  }

  const handleDeleteField = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field?')) {
      onFieldsChange(fields.filter(f => f.id !== fieldId))
    }
  }

  const handleCancel = () => {
    setEditingField(null)
    setShowAddForm(false)
    setNewField({
      name: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
      description: ''
    })
  }

  const addOption = () => {
    setNewField(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }))
  }

  const updateOption = (index: number, value: string) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }))
  }

  const removeOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">
            Custom Fields for {recordType.charAt(0).toUpperCase() + recordType.slice(1)}
          </h3>
        </div>
        {!showAddForm && !editingField && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        )}
      </div>

      {/* Existing Fields */}
      {fields.length > 0 && (
        <div className="space-y-3 mb-6">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">{field.name}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    field.type === 'select' ? 'bg-purple-100 text-purple-800' :
                    field.type === 'date' ? 'bg-green-100 text-green-800' :
                    field.type === 'number' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {fieldTypes.find(t => t.value === field.type)?.label}
                  </span>
                  {field.required && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                      Required
                    </span>
                  )}
                </div>
                {field.description && (
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditField(field)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteField(field.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingField) && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">
            {editingField ? 'Edit Field' : 'Add New Field'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Name *
              </label>
              <input
                type="text"
                value={newField.name || ''}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Industry, Budget, Notes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type *
              </label>
              <select
                value={newField.type || 'text'}
                onChange={(e) => setNewField({ ...newField, type: e.target.value as CustomField['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Field type"
              >
                {fieldTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder Text
              </label>
              <input
                type="text"
                value={newField.placeholder || ''}
                onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Enter your industry"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newField.description || ''}
                onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Options for Select Fields */}
          {newField.type === 'select' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {newField.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Required Checkbox */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newField.required || false}
                onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Required field</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={editingField ? handleSaveEdit : handleAddField}
              disabled={!newField.name?.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingField ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {fields.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Custom Fields</h3>
          <p className="text-gray-600 mb-4">
            Add custom fields to capture additional information for your {recordType}.
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Field
          </Button>
        </div>
      )}
    </div>
  )
}
