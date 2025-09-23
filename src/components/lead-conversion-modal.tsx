'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { AddressInput } from '@/components/ui/address-input'
import { Lead, AccountInsert, ContactInsert } from '@/lib/supabase-client'

interface LeadConversionModalProps {
  lead: Lead
  isOpen: boolean
  onClose: () => void
  onConvert: (conversionData: any) => Promise<void>
  opportunityId?: string
}

export function LeadConversionModal({
  lead,
  isOpen,
  onClose,
  onConvert,
  opportunityId
}: LeadConversionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Account, 2: Contact, 3: Review
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Account data
  const [accountData, setAccountData] = useState({
    name: lead.company || `${lead.first_name} ${lead.last_name}`,
    email: lead.email || '',
    phone: lead.phone || '',
    website: '',
    industry: '',
    size: ''
  })

  // Contact data
  const [contactData, setContactData] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email || '',
    phone: lead.phone || '',
    title: '',
    department: ''
  })

  // Mailing address
  const [mailingAddress, setMailingAddress] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setErrors({})
      setAccountData({
        name: lead.company || `${lead.first_name} ${lead.last_name}`,
        email: lead.email || '',
        phone: lead.phone || '',
        website: '',
        industry: '',
        size: ''
      })
      setContactData({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email || '',
        phone: lead.phone || '',
        title: '',
        department: ''
      })
      setMailingAddress({
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      })
    }
  }, [isOpen, lead])

  const handleAccountInputChange = (field: string, value: string) => {
    setAccountData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleContactInputChange = (field: string, value: string) => {
    setContactData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddressChange = (addressData: any) => {
    setMailingAddress(addressData)
  }

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!accountData.name.trim()) newErrors.name = 'Account name is required'
      if (accountData.email && !/\S+@\S+\.\S+/.test(accountData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    if (stepNumber === 2) {
      if (!contactData.first_name.trim()) newErrors.first_name = 'First name is required'
      if (!contactData.last_name.trim()) newErrors.last_name = 'Last name is required'
      if (contactData.email && !/\S+@\S+\.\S+/.test(contactData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

    setIsLoading(true)
    try {
      await onConvert({
        accountData,
        contactData,
        mailingAddress,
        opportunityId
      })
      onClose()
    } catch (error) {
      console.error('Error converting lead:', error)
      alert('Failed to convert lead. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Create Account'
      case 2: return 'Create Contact'
      case 3: return 'Review & Convert'
      default: return 'Convert Lead'
    }
  }

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Set up the account information for this lead'
      case 2: return 'Create a contact record for the primary contact'
      case 3: return 'Review the information before converting the lead'
      default: return ''
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getStepTitle()}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    stepNumber < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600">{getStepDescription()}</p>

        {/* Step 1: Account Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name *
              </label>
              <Input
                value={accountData.name}
                onChange={(e) => handleAccountInputChange('name', e.target.value)}
                placeholder="Company or individual name"
                required
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={accountData.email}
                  onChange={(e) => handleAccountInputChange('email', e.target.value)}
                  placeholder="company@example.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={accountData.phone}
                  onChange={(e) => handleAccountInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                value={accountData.website}
                onChange={(e) => handleAccountInputChange('website', e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry
                </label>
                <Select
                  value={accountData.industry}
                  onChange={(e) => handleAccountInputChange('industry', e.target.value)}
                >
                  <option value="">Select industry</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Size
                </label>
                <Select
                  value={accountData.size}
                  onChange={(e) => handleAccountInputChange('size', e.target.value)}
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </Select>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Mailing Address</h4>
              <AddressInput
                onAddressChange={handleAddressChange}
                initialAddress={mailingAddress}
              />
            </div>
          </div>
        )}

        {/* Step 2: Contact Information */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <Input
                  value={contactData.first_name}
                  onChange={(e) => handleContactInputChange('first_name', e.target.value)}
                  required
                />
                {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <Input
                  value={contactData.last_name}
                  onChange={(e) => handleContactInputChange('last_name', e.target.value)}
                  required
                />
                {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => handleContactInputChange('email', e.target.value)}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={contactData.phone}
                  onChange={(e) => handleContactInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Input
                  value={contactData.title}
                  onChange={(e) => handleContactInputChange('title', e.target.value)}
                  placeholder="e.g., CEO, Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <Input
                  value={contactData.department}
                  onChange={(e) => handleContactInputChange('department', e.target.value)}
                  placeholder="e.g., Sales, Marketing"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Information</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {accountData.name}</p>
                {accountData.email && <p><strong>Email:</strong> {accountData.email}</p>}
                {accountData.phone && <p><strong>Phone:</strong> {accountData.phone}</p>}
                {accountData.website && <p><strong>Website:</strong> {accountData.website}</p>}
                {accountData.industry && <p><strong>Industry:</strong> {accountData.industry}</p>}
                {accountData.size && <p><strong>Size:</strong> {accountData.size}</p>}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Contact Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {contactData.first_name} {contactData.last_name}</p>
                {contactData.email && <p><strong>Email:</strong> {contactData.email}</p>}
                {contactData.phone && <p><strong>Phone:</strong> {contactData.phone}</p>}
                {contactData.title && <p><strong>Title:</strong> {contactData.title}</p>}
                {contactData.department && <p><strong>Department:</strong> {contactData.department}</p>}
              </div>
            </div>

            {mailingAddress.address_line1 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Mailing Address</h4>
                <div className="text-sm text-gray-600">
                  <p>{mailingAddress.address_line1}</p>
                  {mailingAddress.address_line2 && <p>{mailingAddress.address_line2}</p>}
                  <p>
                    {mailingAddress.city}
                    {mailingAddress.state && `, ${mailingAddress.state}`}
                    {mailingAddress.postal_code && ` ${mailingAddress.postal_code}`}
                  </p>
                  <p>{mailingAddress.country}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will convert the lead "{lead.first_name} {lead.last_name}" 
                into an account and contact. The lead will be marked as converted and linked to the new records.
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Converting...' : 'Convert Lead'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}