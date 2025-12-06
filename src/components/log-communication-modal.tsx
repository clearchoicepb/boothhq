'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('components')

interface LogCommunicationModalProps {
  isOpen: boolean
  onClose: () => void
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string
  eventId?: string
  onSuccess?: () => void
}

export function LogCommunicationModal({
  isOpen,
  onClose,
  opportunityId,
  accountId,
  contactId,
  leadId,
  eventId,
  onSuccess
}: LogCommunicationModalProps) {
  const [formData, setFormData] = useState({
    communication_type: 'phone',
    direction: 'outbound',
    subject: '',
    notes: '',
    communication_date: new Date().toISOString().slice(0, 16), // datetime-local format
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.communication_type) newErrors.communication_type = 'Type is required'
    if (!formData.direction) newErrors.direction = 'Direction is required'
    if (!formData.communication_date) newErrors.communication_date = 'Date is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          opportunity_id: opportunityId || null,
          account_id: accountId || null,
          contact_id: contactId || null,
          lead_id: leadId || null,
          event_id: eventId || null, // Link to event for activity tracking
          status: 'logged',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to log communication')
      }

      // Reset form
      setFormData({
        communication_type: 'phone',
        direction: 'outbound',
        subject: '',
        notes: '',
        communication_date: new Date().toISOString().slice(0, 16),
      })

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error) {
      log.error({ error }, 'Error logging communication')
      toast.error('Failed to log communication. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Communication">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Communication Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <Select
            value={formData.communication_type}
            onChange={(e) => handleInputChange('communication_type', e.target.value)}
            className={errors.communication_type ? 'border-red-500' : ''}
          >
            <option value="phone">Phone Call</option>
            <option value="email">Email</option>
            <option value="sms">SMS/Text</option>
            <option value="in_person">In-Person Meeting</option>
            <option value="other">Other</option>
          </Select>
          {errors.communication_type && (
            <p className="text-red-500 text-xs mt-1">{errors.communication_type}</p>
          )}
        </div>

        {/* Direction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Direction *
          </label>
          <Select
            value={formData.direction}
            onChange={(e) => handleInputChange('direction', e.target.value)}
            className={errors.direction ? 'border-red-500' : ''}
          >
            <option value="outbound">Outbound (We contacted them)</option>
            <option value="inbound">Inbound (They contacted us)</option>
          </Select>
          {errors.direction && (
            <p className="text-red-500 text-xs mt-1">{errors.direction}</p>
          )}
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date & Time *
          </label>
          <Input
            type="datetime-local"
            value={formData.communication_date}
            onChange={(e) => handleInputChange('communication_date', e.target.value)}
            className={errors.communication_date ? 'border-red-500' : ''}
          />
          {errors.communication_date && (
            <p className="text-red-500 text-xs mt-1">{errors.communication_date}</p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <Input
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Brief description of the communication"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="What was discussed? What are the next steps?"
            rows={4}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging...' : 'Log Communication'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
