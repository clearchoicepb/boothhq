'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Loader2, FileText } from 'lucide-react'
import { getMergeFieldData, replaceMergeFields } from '@/lib/merge-fields'

interface Template {
  id: string
  name: string
  content: string
}

interface SendSMSModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (communication: any) => void
  defaultTo?: string
  defaultMessage?: string
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string
}

export function SendSMSModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTo = '',
  defaultMessage = '',
  opportunityId,
  accountId,
  contactId,
  leadId
}: SendSMSModalProps) {
  const [loading, setLoading] = useState(false)
  const [to, setTo] = useState(defaultTo)
  const [message, setMessage] = useState(defaultMessage)
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
      const response = await fetch('/api/templates?type=sms')
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
      setMessage(defaultMessage)
      setError('')
      setSelectedTemplateId('')
    }
  }, [isOpen, defaultTo, defaultMessage])

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
    const replacedMessage = replaceMergeFields(template.content, mergeData)

    // Set message from template
    setMessage(replacedMessage)
  }

  const handleSend = async () => {
    // Validate
    if (!to || !message) {
      setError('Please fill in all fields')
      return
    }

    // Basic phone number validation (allow various formats)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
    if (!phoneRegex.test(to.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number (e.g., +1234567890 or 123-456-7890)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/integrations/twilio/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          message,
          opportunity_id: opportunityId,
          account_id: accountId,
          contact_id: contactId,
          lead_id: leadId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS')
      }

      // Success
      if (onSuccess) {
        onSuccess(data.communication)
      }

      onClose()
    } catch (err) {
      console.error('Error sending SMS:', err)
      setError(err instanceof Error ? err.message : 'Failed to send SMS. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const charCount = message.length
  const maxChars = 160 // Standard SMS length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send SMS"
      className="sm:max-w-2xl"
    >
      <div className="space-y-4">
        {/* To Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <Input
            type="tel"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+1234567890 or 123-456-7890"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Include country code (e.g., +1 for US)
          </p>
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

        {/* Message Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here"
            rows={6}
            disabled={loading}
            className="w-full"
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              Standard SMS length is 160 characters
            </p>
            <p className={`text-xs ${charCount > maxChars ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
              {charCount} characters
              {charCount > maxChars && ` (${Math.ceil(charCount / maxChars)} messages)`}
            </p>
          </div>
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
                <MessageSquare className="h-4 w-4 mr-2" />
                Send SMS
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
