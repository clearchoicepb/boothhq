'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FormBuilder } from './FormBuilder'
import { FormPreview } from './FormPreview'
import {
  Plus,
  FileText,
  Link2,
  Eye,
  Pencil,
  Trash2,
  Check,
  Clock,
  Send,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'
import type {
  EventForm,
  EventFormTemplate,
  FormField,
  EventFormStatus,
} from '@/types/event-forms'

const log = createLogger('event-forms-section')

interface EventFormsSectionProps {
  eventId: string
  tenantSubdomain: string
}

/**
 * EventFormsSection Component
 *
 * Displays and manages forms attached to an event.
 * Used within the Planning tab.
 */
export function EventFormsSection({ eventId, tenantSubdomain }: EventFormsSectionProps) {
  // Data state
  const [forms, setForms] = useState<EventForm[]>([])
  const [templates, setTemplates] = useState<EventFormTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedForm, setSelectedForm] = useState<EventForm | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Form state for creating/editing
  const [formName, setFormName] = useState('')
  const [formFields, setFormFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)

  // Link copied feedback state
  const [linkCopiedFormId, setLinkCopiedFormId] = useState<string | null>(null)

  // Fetch forms and templates
  useEffect(() => {
    fetchForms()
    fetchTemplates()
  }, [eventId])

  const fetchForms = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/forms`)
      if (response.ok) {
        const data = await response.json()
        setForms(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching forms')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/event-form-templates?status=active')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching templates')
    }
  }

  // Open add modal
  const handleAddForm = () => {
    setSelectedTemplateId(null)
    setFormName('')
    setFormFields([])
    setIsAddModalOpen(true)
  }

  // Select template
  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplateId(templateId)
    if (templateId) {
      const template = templates.find((t) => t.id === templateId)
      if (template) {
        setFormName(template.name)
        setFormFields(template.fields || [])
      }
    } else {
      setFormName('')
      setFormFields([])
    }
  }

  // Create form
  const handleCreateForm = async () => {
    if (!formName.trim()) {
      toast.error('Form name is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/events/${eventId}/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          template_id: selectedTemplateId,
          fields: formFields,
        }),
      })

      if (response.ok) {
        toast.success('Form created')
        setIsAddModalOpen(false)
        fetchForms()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to create form')
      }
    } catch (error) {
      log.error({ error }, 'Error creating form')
      toast.error('Error creating form')
    } finally {
      setSaving(false)
    }
  }

  // Open edit modal
  const handleEditForm = (form: EventForm) => {
    setSelectedForm(form)
    setFormName(form.name)
    setFormFields(form.fields || [])
    setIsEditModalOpen(true)
  }

  // Update form
  const handleUpdateForm = async () => {
    if (!selectedForm || !formName.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/events/${eventId}/forms/${selectedForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          fields: formFields,
        }),
      })

      if (response.ok) {
        toast.success('Form updated')
        setIsEditModalOpen(false)
        setSelectedForm(null)
        fetchForms()
      } else {
        toast.error('Failed to update form')
      }
    } catch (error) {
      log.error({ error }, 'Error updating form')
      toast.error('Error updating form')
    } finally {
      setSaving(false)
    }
  }

  // Delete form
  const handleDeleteForm = async (form: EventForm) => {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return

    try {
      const response = await fetch(`/api/events/${eventId}/forms/${form.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Form deleted')
        fetchForms()
      } else {
        toast.error('Failed to delete form')
      }
    } catch (error) {
      log.error({ error }, 'Error deleting form')
      toast.error('Error deleting form')
    }
  }

  // Copy link
  const handleCopyLink = async (form: EventForm) => {
    const url = `${window.location.origin}/forms/${form.public_id}`
    try {
      await navigator.clipboard.writeText(url)

      // Show "Link Copied!" feedback
      setLinkCopiedFormId(form.id)
      setTimeout(() => setLinkCopiedFormId(null), 2000)

      // Mark as sent if it's still a draft
      if (form.status === 'draft') {
        await fetch(`/api/events/${eventId}/forms/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'sent',
            sent_at: new Date().toISOString(),
          }),
        })
        fetchForms()
      }
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  // Preview form
  const handlePreviewForm = (form: EventForm) => {
    setSelectedForm(form)
    setIsPreviewOpen(true)
  }

  // Get status badge
  const getStatusBadge = (status: EventFormStatus) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700">Draft</Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700">Sent</Badge>
      case 'viewed':
        return <Badge className="bg-yellow-100 text-yellow-700">Viewed</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>
      default:
        return null
    }
  }

  // Get status icon
  const getStatusIcon = (status: EventFormStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-400" />
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />
      case 'viewed':
        return <Eye className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Client Forms</h3>
        <Button onClick={handleAddForm} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Form
        </Button>
      </div>

      {/* Forms List */}
      {forms.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FileText className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No forms yet</p>
          <p className="text-xs text-gray-400">Add a form to gather information from your client</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => {
            const linkCopied = linkCopiedFormId === form.id

            return (
              <div
                key={form.id}
                className="bg-gray-50 rounded-lg border border-gray-200"
              >
                {/* Form Header Row */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(form.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{form.name}</span>
                        {getStatusBadge(form.status)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {form.fields?.length || 0} fields
                        {form.completed_at && (
                          <>
                            {' • '}
                            Submitted {new Date(form.completed_at).toLocaleDateString()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreviewForm(form)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {form.status !== 'completed' && (
                      <button
                        onClick={() => handleEditForm(form)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteForm(form)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded hover:bg-gray-200"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Actions Row - matches invoice pattern */}
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleCopyLink(form)}
                      size="sm"
                      variant="outline"
                      className={linkCopied ? 'bg-green-50 border-green-500' : ''}
                    >
                      {linkCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-green-600" />
                          <span className="text-green-600">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 mr-2" />
                          Copy Public Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Form Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Form"
        size="full"
      >
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Template Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start from template or create blank
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSelectTemplate(null)}
                className={`px-3 py-2 text-sm rounded-lg border ${
                  selectedTemplateId === null
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Blank Form
              </button>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    selectedTemplateId === template.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Event Logistics Form"
            />
          </div>

          {/* Form Builder */}
          <div className="flex-1 overflow-auto border-t pt-4">
            <FormBuilder fields={formFields} onChange={setFormFields} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateForm} disabled={saving || !formName.trim()}>
              {saving ? 'Creating...' : 'Create Form'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Form Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Form"
        size="full"
      >
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Form Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Form Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Event Logistics Form"
            />
          </div>

          {/* Form Builder */}
          <div className="flex-1 overflow-auto border-t pt-4">
            <FormBuilder fields={formFields} onChange={setFormFields} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateForm} disabled={saving || !formName.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      {selectedForm && (
        <FormPreview
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false)
            setSelectedForm(null)
          }}
          name={selectedForm.name}
          fields={selectedForm.fields || []}
          responses={selectedForm.responses}
          status={selectedForm.status}
        />
      )}
    </div>
  )
}

export default EventFormsSection
