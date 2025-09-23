'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Calendar, DollarSign, FileText } from 'lucide-react'

interface Customer {
  id: string
  name: string
  type: 'lead' | 'account'
  email?: string
  phone?: string
  company?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id: string
}

interface OpportunityFormNewProps {
  isOpen: boolean
  onClose: () => void
  onSave: (opportunity: any) => void
  customer: Customer
  contact?: Contact
}

export function OpportunityFormNew({ isOpen, onClose, onSave, customer, contact }: OpportunityFormNewProps) {
  const [formData, setFormData] = useState({
    event_name: '',
    event_type: '',
    date_type: 'single', // 'single' or 'multiple'
    event_date: '',
    initial_date: '',
    final_date: '',
    estimated_value: '',
    description: '',
    stage: 'prospecting'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Event type options
  const eventTypes = [
    'Wedding',
    'Corporate Event',
    'Birthday Party',
    'Anniversary',
    'Graduation',
    'Holiday Party',
    'Baby Shower',
    'Bridal Shower',
    'Engagement Party',
    'Retirement Party',
    'Fundraiser',
    'Trade Show',
    'Conference',
    'Festival',
    'Other'
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required'
    }

    if (!formData.event_type) {
      newErrors.event_type = 'Event type is required'
    }

    if (formData.date_type === 'single') {
      if (!formData.event_date) {
        newErrors.event_date = 'Event date is required'
      }
    } else {
      if (!formData.initial_date) {
        newErrors.initial_date = 'Initial date is required'
      }
      if (!formData.final_date) {
        newErrors.final_date = 'Final date is required'
      }
      if (formData.initial_date && formData.final_date && formData.initial_date > formData.final_date) {
        newErrors.final_date = 'Final date must be after initial date'
      }
    }

    if (!formData.estimated_value || parseFloat(formData.estimated_value) <= 0) {
      newErrors.estimated_value = 'Estimated value must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Create a clean opportunity data object without circular references
      const opportunityData = {
        name: formData.event_name,
        description: formData.description || null,
        amount: parseFloat(formData.estimated_value),
        stage: formData.stage,
        probability: 50, // Default probability for new opportunities
        event_type: formData.event_type || null,
        date_type: formData.date_type,
        event_date: formData.date_type === 'single' ? formData.event_date || null : null,
        initial_date: formData.date_type === 'multiple' ? formData.initial_date || null : null,
        final_date: formData.date_type === 'multiple' ? formData.final_date || null : null,
        expected_close_date: formData.date_type === 'single' ? formData.event_date || null : formData.final_date || null,
        account_id: customer.type === 'account' ? customer.id : null,
        contact_id: contact?.id || null,
        lead_id: customer.type === 'lead' ? customer.id : null
      }

      console.log('Opportunity form data being sent:', opportunityData)
      onSave(opportunityData)
    } catch (error) {
      console.error('Error saving opportunity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Opportunity"
      className="sm:max-w-2xl"
    >
      <div className="space-y-6">
        {/* Customer Information Display */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Customer Information</h3>
          <div className="text-sm text-gray-600">
            <div><strong>Name:</strong> {customer.name}</div>
            {customer.email && <div><strong>Email:</strong> {customer.email}</div>}
            {customer.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
            {contact && (
              <div><strong>Contact:</strong> {contact.first_name} {contact.last_name}</div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <Input
              required
              value={formData.event_name}
              onChange={(e) => handleInputChange('event_name', e.target.value)}
              placeholder="e.g., John & Jane Wedding"
              className={errors.event_name ? 'border-red-500' : ''}
            />
            {errors.event_name && (
              <p className="text-red-500 text-sm mt-1">{errors.event_name}</p>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type *
            </label>
            <Select
              value={formData.event_type}
              onChange={(e) => handleInputChange('event_type', e.target.value)}
              className={errors.event_type ? 'border-red-500' : ''}
            >
              <option value="">Select event type</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            {errors.event_type && (
              <p className="text-red-500 text-sm mt-1">{errors.event_type}</p>
            )}
          </div>

          {/* Date Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Duration *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleInputChange('date_type', 'single')}
                className={`p-3 border-2 rounded-lg text-center transition-colors ${
                  formData.date_type === 'single'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">Single Day</div>
                <div className="text-sm text-gray-600">One event date</div>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('date_type', 'multiple')}
                className={`p-3 border-2 rounded-lg text-center transition-colors ${
                  formData.date_type === 'multiple'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <div className="font-medium">Multiple Days</div>
                <div className="text-sm text-gray-600">Date range</div>
              </button>
            </div>
          </div>

          {/* Date Inputs */}
          {formData.date_type === 'single' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Date *
              </label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
                className={errors.event_date ? 'border-red-500' : ''}
              />
              {errors.event_date && (
                <p className="text-red-500 text-sm mt-1">{errors.event_date}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Date *
                </label>
                <Input
                  type="date"
                  value={formData.initial_date}
                  onChange={(e) => handleInputChange('initial_date', e.target.value)}
                  className={errors.initial_date ? 'border-red-500' : ''}
                />
                {errors.initial_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.initial_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Date *
                </label>
                <Input
                  type="date"
                  value={formData.final_date}
                  onChange={(e) => handleInputChange('final_date', e.target.value)}
                  className={errors.final_date ? 'border-red-500' : ''}
                />
                {errors.final_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.final_date}</p>
                )}
              </div>
            </div>
          )}

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Value *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.estimated_value}
                onChange={(e) => handleInputChange('estimated_value', e.target.value)}
                placeholder="0.00"
                className={`pl-10 ${errors.estimated_value ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.estimated_value && (
              <p className="text-red-500 text-sm mt-1">{errors.estimated_value}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional details about the event..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isSubmitting ? 'Creating...' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
