'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { X, User, Building2 } from 'lucide-react'

interface LeadFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (lead: any) => Promise<void>
  editingLead?: any | null
}

type LeadType = 'personal' | 'company' | null

export function LeadForm({ isOpen, onClose, onSave, editingLead }: LeadFormProps) {
  const [leadType, setLeadType] = useState<LeadType>(null)
  const [formData, setFormData] = useState({
    lead_type: 'personal',
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

  useEffect(() => {
    if (editingLead) {
      // Determine lead type based on whether company field is populated
      const leadType = editingLead.company ? 'company' : 'personal'
      setLeadType(leadType)
      setFormData({
        lead_type: leadType,
        first_name: editingLead.first_name || '',
        last_name: editingLead.last_name || '',
        email: editingLead.email || '',
        phone: editingLead.phone || '',
        company: editingLead.company || '',
        company_url: editingLead.company_url || '',
        photo_url: editingLead.photo_url || '',
        source: editingLead.source || '',
        status: editingLead.status || 'new',
        notes: editingLead.notes || ''
      })
    } else {
      // Reset form for new lead
      setLeadType(null)
      setFormData({
        lead_type: 'personal',
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
    }
    setErrors({})
  }, [editingLead, isOpen])

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
      onClose()
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
    <Modal isOpen={isOpen} onClose={onClose} title={editingLead ? 'Edit Lead' : 'New Lead'}>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lead Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Lead Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setLeadType('personal')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  leadType === 'personal'
                    ? 'border-[#347dc4] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <User className={`h-6 w-6 mr-3 ${leadType === 'personal' ? 'text-[#347dc4]' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">Personal</div>
                    <div className="text-sm text-gray-500">Individual customer</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLeadType('company')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  leadType === 'company'
                    ? 'border-[#347dc4] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Building2 className={`h-6 w-6 mr-3 ${leadType === 'company' ? 'text-[#347dc4]' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">Company</div>
                    <div className="text-sm text-gray-500">Business/Organization</div>
                  </div>
                </div>
              </button>
            </div>
            {errors.leadType && <p className="text-red-600 text-sm mt-1">{errors.leadType}</p>}
          </div>

          {/* Form Fields - Only show after lead type is selected or when editing */}
          {(leadType || editingLead) && (
            <>
              {/* Photo Upload Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
                <PhotoUpload
                  currentPhotoUrl={formData.photo_url}
                  onPhotoChange={(photoUrl) => handleInputChange('photo_url', photoUrl)}
                  entityType="lead"
                  entityName={getDisplayName()}
                  websiteUrl={formData.company_url}
                />
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <Input
                      id="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                    />
                    {errors.first_name && <p className="text-red-600 text-sm mt-1">{errors.first_name}</p>}
                  </div>

                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <Input
                      id="last_name"
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                    />
                    {errors.last_name && <p className="text-red-600 text-sm mt-1">{errors.last_name}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Company Information - Only for company leads */}
              {leadType === 'company' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                  
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <Input
                      id="company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      placeholder="Enter company name"
                    />
                    {errors.company && <p className="text-red-600 text-sm mt-1">{errors.company}</p>}
                  </div>

                  {/* Company URL */}
                  <div>
                    <label htmlFor="company_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Website
                    </label>
                    <Input
                      id="company_url"
                      type="url"
                      value={formData.company_url}
                      onChange={(e) => handleInputChange('company_url', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              )}

              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Lead Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="unqualified">Unqualified</option>
                      <option value="converted">Converted</option>
                    </Select>
                  </div>
                </div>


                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Add any additional notes about this lead..."
                    rows={3}
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
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
              disabled={isSubmitting || !leadType}
              className="bg-[#347dc4] text-white hover:bg-[#2c6ba8]"
            >
              {isSubmitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
