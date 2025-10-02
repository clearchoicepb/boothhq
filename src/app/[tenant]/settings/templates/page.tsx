'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { ArrowLeft, Plus, Edit, Trash2, Mail, MessageSquare, FileText } from 'lucide-react'

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
  const subjectInputRef = useRef<HTMLInputElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  const mergeFields = [
    { label: 'First Name', value: '{{first_name}}' },
    { label: 'Last Name', value: '{{last_name}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Phone', value: '{{phone}}' },
    { label: 'Company', value: '{{company_name}}' },
    { label: 'Opportunity', value: '{{opportunity_name}}' },
    { label: 'Amount', value: '{{amount}}' },
    { label: 'Event Date', value: '{{event_date}}' },
  ]

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
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setFormData({ name: '', subject: '', content: '' })
    setIsModalOpen(true)
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject || '',
      content: template.content,
    })
    setIsModalOpen(true)
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
        alert('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error saving template')
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
        alert('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template')
    }
  }

  const insertMergeField = (field: string, target: 'subject' | 'content') => {
    if (target === 'subject' && subjectInputRef.current) {
      const input = subjectInputRef.current
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newValue = formData.subject.substring(0, start) + field + formData.subject.substring(end)

      setFormData({ ...formData, subject: newValue })

      // Set cursor position after inserted text
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + field.length, start + field.length)
      }, 0)
    } else if (target === 'content' && contentTextareaRef.current) {
      const textarea = contentTextareaRef.current
      const start = textarea.selectionStart || 0
      const end = textarea.selectionEnd || 0
      const newValue = formData.content.substring(0, start) + field + formData.content.substring(end)

      setFormData({ ...formData, content: newValue })

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + field.length, start + field.length)
      }, 0)
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

  return (
    <AppLayout>
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
                          <p className="text-sm text-gray-800 mt-2 line-clamp-2">{template.content}</p>
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
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>

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
                    <div className="mb-2 flex flex-wrap gap-2">
                      {mergeFields.map((field) => (
                        <button
                          key={field.value}
                          type="button"
                          onClick={() => insertMergeField(field.value, 'subject')}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          + {field.label}
                        </button>
                      ))}
                    </div>
                    <input
                      ref={subjectInputRef}
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g., Welcome to {{company_name}}"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {mergeFields.map((field) => (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => insertMergeField(field.value, 'content')}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        + {field.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    ref={contentTextareaRef}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm text-gray-900"
                    placeholder={`Hi {{first_name}},\n\nThank you for your interest...\n\nBest regards,\n{{company_name}}`}
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
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
