'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { PhotoUpload } from '@/components/ui/photo-upload'

interface LeadFormSequentialProps {
  onSave: (lead: any) => Promise<void>
  onCancel: () => void
}

type LeadType = 'personal' | 'company' | null

export function LeadFormSequential({ onSave, onCancel }: LeadFormSequentialProps) {
  const [leadType, setLeadType] = useState<LeadType>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    company_url: '',
    photo_url: '',
    source: '',
    status: 'new',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Source options
  const sourceOptions = [
    'Website',
    'Referral',
    'Social Media',
    'Google Search',
    'Facebook',
    'Instagram',
    'Event',
    'Cold Call',
    'Other'
  ]

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.email?.trim()) newErrors.email = 'Email is required'
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (leadType === 'company' && !formData.company?.trim()) {
      newErrors.company = 'Company name is required for company leads'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!leadType) {
      setErrors({ leadType: 'Please select a lead type' })
      return
    }

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const dataToSave = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        company: leadType === 'company' ? formData.company : null,
        source: formData.source || null,
        status: formData.status,
        notes: formData.notes || null,
        lead_type: leadType,
        company_url: leadType === 'company' ? formData.company_url : null,
        photo_url: formData.photo_url || null,
      }

      console.log('Lead form data being sent:', dataToSave)
      await onSave(dataToSave)
      // Don't call onClose() here - let the parent component handle the flow
    } catch (error) {
      console.error('Error saving lead:', error)
      alert('Error saving lead. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDisplayName = () => {
    if (leadType === 'company' && formData.company) {
      return formData.company
    }
    return `${formData.first_name} ${formData.last_name}`.trim()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Lead Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Lead Type *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setLeadType('personal')}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              leadType === 'personal'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">Personal</div>
            <div className="text-sm text-gray-600">Individual person</div>
          </button>
          <button
            type="button"
            onClick={() => setLeadType('company')}
            className={`p-4 border-2 rounded-lg text-center transition-colors ${
              leadType === 'company'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">Company</div>
            <div className="text-sm text-gray-600">Business/Organization</div>
          </button>
        </div>
        {errors.leadType && (
          <p className="text-red-500 text-sm mt-1">{errors.leadType}</p>
        )}
      </div>

      {/* Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photo
        </label>
        <PhotoUpload
          currentPhotoUrl={formData.photo_url}
          onPhotoChange={(photoUrl) => handleInputChange('photo_url', photoUrl)}
          entityType="lead"
          entityName={getDisplayName() || 'Lead'}
        />
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <Input
            required
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            className={errors.first_name ? 'border-red-500' : ''}
          />
          {errors.first_name && (
            <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <Input
            required
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            className={errors.last_name ? 'border-red-500' : ''}
          />
          {errors.last_name && (
            <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <Input
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
          />
        </div>
      </div>

      {/* Company Information (only for company leads) */}
      {leadType === 'company' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <Input
              required
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className={errors.company ? 'border-red-500' : ''}
            />
            {errors.company && (
              <p className="text-red-500 text-sm mt-1">{errors.company}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company URL
            </label>
            <Input
              type="url"
              value={formData.company_url}
              onChange={(e) => handleInputChange('company_url', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      )}

      {/* Source and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <Select
            value={formData.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
          >
            <option value="">Select source</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <Select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          placeholder="Additional notes about this lead..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Lead...' : 'Create Lead & Continue'}
        </Button>
      </div>
    </form>
  )
}









