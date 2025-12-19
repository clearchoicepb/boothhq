'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'
import { ArrowLeft, Plus, Edit, Trash2, Mail, MessageSquare, FileText } from 'lucide-react'
import TemplateBuilder from '@/components/templates/TemplateBuilder'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('templates')

interface Template {
  id: string
  template_type: 'email' | 'sms' | 'contract'
  name: string
  subject: string | null
  content: string
  is_active: boolean
  created_at: string
}

type TemplateType = 'email' | 'sms' | 'contract'

export default function TemplatesSettingsPage() {
  const { tenant: tenantSubdomain } = useParams()
  const [activeTab, setActiveTab] = useState<TemplateType>('email')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
  })
  const [saving, setSaving] = useState(false)
  const [isBuilderMode, setIsBuilderMode] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [activeTab])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/templates?type=${activeTab}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setFormData({ name: '', subject: '', content: '' })
    if (activeTab === 'contract') {
      setIsBuilderMode(true)
    } else {
      setIsModalOpen(true)
    }
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject || '',
      content: template.content,
    })
    if (activeTab === 'contract') {
      setIsBuilderMode(true)
    } else {
      setIsModalOpen(true)
    }
  }

  const handleSaveFromBuilder = async (templateData: any) => {
    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'

      const method = editingTemplate ? 'PUT' : 'POST'

      const payload = {
        ...templateData,
        template_type: 'contract',
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      setIsBuilderMode(false)
      setEditingTemplate(null)
      fetchTemplates()
    } catch (error) {
      log.error({ error }, 'Error saving template')
      throw error
    }
  }

  const handleSaveTemplate = async () => {
    try {
      setSaving(true)

      const payload = {
        template_type: activeTab,
        name: formData.name,
        subject: activeTab === 'email' ? formData.subject : null,
        content: formData.content,
      }

      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'

      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchTemplates()
      } else {
        toast.error('Failed to save template')
      }
    } catch (error) {
      log.error({ error }, 'Error saving template')
      toast.error('Error saving template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTemplates()
      } else {
        toast.error('Failed to delete template')
      }
    } catch (error) {
      log.error({ error }, 'Error deleting template')
      toast.error('Error deleting template')
    }
  }

  const getTabIcon = (type: TemplateType) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'contract':
        return <FileText className="h-4 w-4" />
    }
  }

  // Show Template Builder if in builder mode
  if (isBuilderMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TemplateBuilder
          initialTemplate={editingTemplate ? {
            id: editingTemplate.id,
            name: editingTemplate.name,
            sections: (editingTemplate as any).sections || [],
            template_type: editingTemplate.template_type,
            content: editingTemplate.content
          } : undefined}
          onSave={handleSaveFromBuilder}
          onCancel={() => {
            setIsBuilderMode(false)
            setEditingTemplate(null)
          }}
        />
      </div>
    )
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
                <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
              </div>
              <button
                onClick={handleCreateTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {(['email', 'sms', 'contract'] as TemplateType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm ${
                      activeTab === type
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {getTabIcon(type)}
                    {type.charAt(0).toUpperCase() + type.slice(1)} Templates
                  </button>
                ))}
              </nav>
            </div>

            {/* Templates List */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No {activeTab} templates yet. Create your first one!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                          {template.subject && (
                            <p className="text-sm text-gray-700 mt-1">Subject: {template.subject}</p>
                          )}
                          {/* Only show content preview for email and SMS templates, not contracts */}
                          {activeTab !== 'contract' && (
                            <p className="text-sm text-gray-800 mt-2 line-clamp-2">{template.content}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        className="sm:max-w-2xl"
      >
        <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="e.g., Welcome Email"
                  />
                </div>

                {activeTab === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g., Welcome to {{company_name}}"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use merge fields like {'{{first_name}}'}, {'{{company_name}}'}, etc.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    placeholder={activeTab === 'sms'
                      ? "Hi {{first_name}}, thank you for your interest..."
                      : "Hi {{first_name}},\n\nThank you for your interest...\n\nBest regards,\n{{company_name}}"
                    }
                    minHeight={activeTab === 'sms' ? '100px' : '200px'}
                    showMergeFields={true}
                  />
                </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={saving || !formData.name || !formData.content}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
