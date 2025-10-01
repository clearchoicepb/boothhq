'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Loader2 } from 'lucide-react'

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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo)
      setSubject(defaultSubject)
      setBody(defaultBody)
      setError('')
    }
  }, [isOpen, defaultTo, defaultSubject, defaultBody])

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
