'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import FormBuilder from '@/components/event-forms/FormBuilder'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Eye,
  EyeOff,
  Search,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import type {
  EventFormTemplate,
  FormField,
  FormTemplateCategory,
  FormTemplateStatus,
} from '@/types/event-forms'

const log = createLogger('event-forms-settings')

const CATEGORIES: { value: FormTemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'design', label: 'Design' },
  { value: 'survey', label: 'Survey' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
]

/**
 * Event Forms Settings Page
 *
 * Allows tenants to manage reusable form templates.
 * Templates can be used to create event-specific forms for clients.
 */
export default function EventFormsSettingsPage() {
  const { tenant: tenantSubdomain } = useParams()

  // State
  const [templates, setTemplates] = useState<EventFormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<FormTemplateCategory | 'all'>('all')

  // Modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EventFormTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other' as FormTemplateCategory,
    status: 'active' as FormTemplateStatus,
    fields: [] as FormField[],
  })
  const [saving, setSaving] = useState(false)

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/event-form-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      } else {
        toast.error('Failed to load templates')
      }
    } catch (error) {
      log.error({ error }, 'Error fetching templates')
      toast.error('Error loading templates')
    } finally {
      setLoading(false)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      categoryFilter === 'all' || template.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Open create modal
  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      category: 'other',
      status: 'active',
      fields: [],
    })
    setIsEditorOpen(true)
  }

  // Open edit modal
  const handleEdit = (template: EventFormTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      status: template.status,
      fields: template.fields || [],
    })
    setIsEditorOpen(true)
  }

  // Duplicate template
  const handleDuplicate = async (template: EventFormTemplate) => {
    try {
      const response = await fetch('/api/event-form-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Copy of ${template.name}`,
          description: template.description,
          category: template.category,
          status: 'inactive',
          fields: template.fields,
        }),
      })

      if (response.ok) {
        toast.success('Template duplicated')
        fetchTemplates()
      } else {
        toast.error('Failed to duplicate template')
      }
    } catch (error) {
      log.error({ error }, 'Error duplicating template')
      toast.error('Error duplicating template')
    }
  }

  // Toggle status
  const handleToggleStatus = async (template: EventFormTemplate) => {
    const newStatus = template.status === 'active' ? 'inactive' : 'active'
    try {
      const response = await fetch(`/api/event-form-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success(`Template ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
        fetchTemplates()
      } else {
        toast.error('Failed to update template')
      }
    } catch (error) {
      log.error({ error }, 'Error updating template status')
      toast.error('Error updating template')
    }
  }

  // Delete template
  const handleDelete = async (template: EventFormTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/event-form-templates/${template.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Template deleted')
        fetchTemplates()
      } else {
        toast.error('Failed to delete template')
      }
    } catch (error) {
      log.error({ error }, 'Error deleting template')
      toast.error('Error deleting template')
    }
  }

  // Save template
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required')
      return
    }

    setSaving(true)
    try {
      const url = editingTemplate
        ? `/api/event-form-templates/${editingTemplate.id}`
        : '/api/event-form-templates'

      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingTemplate ? 'Template updated' : 'Template created')
        setIsEditorOpen(false)
        fetchTemplates()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save template')
      }
    } catch (error) {
      log.error({ error }, 'Error saving template')
      toast.error('Error saving template')
    } finally {
      setSaving(false)
    }
  }

  // Get category badge color
  const getCategoryColor = (category: FormTemplateCategory) => {
    switch (category) {
      case 'logistics':
        return 'bg-blue-100 text-blue-800'
      case 'design':
        return 'bg-purple-100 text-purple-800'
      case 'survey':
        return 'bg-green-100 text-green-800'
      case 'feedback':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link
                href={`/${tenantSubdomain}/settings`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Event Form Templates</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Create reusable form templates for gathering client information
                </p>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as FormTemplateCategory | 'all')}
              className="w-full sm:w-48"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {templates.length === 0 ? 'No templates yet' : 'No matching templates'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {templates.length === 0
                ? 'Get started by creating your first form template.'
                : 'Try adjusting your search or filter.'}
            </p>
            {templates.length === 0 && (
              <div className="mt-6">
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fields
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className={template.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.fields?.length || 0} field{template.fields?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          template.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {template.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleStatus(template)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                          title={template.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {template.status === 'active' ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(template)}
                          className="p-2 text-gray-400 hover:text-green-600 rounded hover:bg-gray-100"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="full"
      >
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Template Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Logistics Form, Design Brief"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as FormTemplateCategory })
                  }
                >
                  <option value="logistics">Logistics</option>
                  <option value="design">Design</option>
                  <option value="survey">Survey</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as FormTemplateStatus })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Internal notes about this template..."
              rows={2}
            />
          </div>

          {/* Form Builder */}
          <div className="flex-1 overflow-auto border-t pt-4">
            <FormBuilder
              fields={formData.fields}
              onChange={(fields) => setFormData({ ...formData, fields })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
