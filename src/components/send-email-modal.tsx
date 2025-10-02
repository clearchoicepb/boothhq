'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Loader2, FileText } from 'lucide-react'
import { getMergeFieldData, replaceMergeFields } from '@/lib/merge-fields'

interface Template {
  id: string
  name: string
  subject: string | null
  content: string
}

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (communication: any) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string
}

export function SendEmailModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  opportunityId,
  accountId,
  contactId,
  leadId
}: SendEmailModalProps) {
  const [loading, setLoading] = useState(false)
  const [to, setTo] = useState(defaultTo)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // Fetch templates
  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates?type=email')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo)
      setSubject(defaultSubject)
      setBody(defaultBody)
      setError('')
      setSelectedTemplateId('')
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody])

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId)

    if (!templateId) return

    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // Fetch merge field data
    const mergeData = await getMergeFieldData({
      opportunityId,
      accountId,
      contactId,
      leadId,
    })

    // Replace merge fields in template
    const replacedSubject = template.subject ? replaceMergeFields(template.subject, mergeData) : ''
    const replacedBody = replaceMergeFields(template.content, mergeData)

    // Set subject and body from template
    setSubject(replacedSubject)
    setBody(replacedBody)
  }

  const handleSend = async () => {
    // Validate
    if (!to || !subject || !body) {
      setError('Please fill in all fields')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/gmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          body,
          opportunity_id: opportunityId,
          account_id: accountId,
          contact_id: contactId,
          lead_id: leadId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      // Success
      if (onSuccess) {
        onSuccess(data.communication)
      }

      onClose()
    } catch (err) {
      console.error('Error sending email:', err)
      setError(err instanceof Error ? err.message : 'Failed to send email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Email"
      className="sm:max-w-2xl"
    >
      <div className="space-y-4">
        {/* To Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            disabled={loading}
          />
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Choose Template (Optional)
            </label>
            <div className="relative">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={loading}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <FileText className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Subject Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            disabled={loading}
          />
        </div>

        {/* Body Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body"
            rows={10}
            disabled={loading}
            className="w-full"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading}
            className="bg-[#347dc4] hover:bg-[#2c6ba8]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
