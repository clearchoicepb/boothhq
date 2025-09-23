'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { X } from 'lucide-react'
import type { Account, AccountInsert, AccountUpdate } from '@/lib/supabase-client' // cspell:ignore supabase

interface AccountFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (account: AccountInsert | AccountUpdate) => Promise<void>
  editingAccount?: Account | null
}

export function AccountForm({ isOpen, onClose, onSave, editingAccount }: AccountFormProps) {
  const [formData, setFormData] = useState<AccountInsert>({
    name: '',
    industry: null,
    website: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postal_code: null,
    annual_revenue: null,
    employee_count: null,
    status: 'active'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Industry options
  const industryOptions = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Real Estate',
    'Consulting',
    'Legal',
    'Marketing',
    'Other'
  ]

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        name: editingAccount.name || '',
        industry: editingAccount.industry,
        website: editingAccount.website,
        phone: editingAccount.phone,
        email: editingAccount.email,
        address: editingAccount.address,
        city: editingAccount.city,
        state: editingAccount.state,
        country: editingAccount.country,
        postal_code: editingAccount.postal_code,
        annual_revenue: editingAccount.annual_revenue,
        employee_count: editingAccount.employee_count,
        status: editingAccount.status
      })
    } else {
      setFormData({
        name: '',
        industry: null,
        website: null,
        phone: null,
        email: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        annual_revenue: null,
        employee_count: null,
        status: 'active'
      })
    }
    setErrors({})
  }, [editingAccount, isOpen])

  const handleInputChange = (field: keyof AccountInsert, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required'
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid website URL (include http:// or https://)'
    }
    
    if (formData.annual_revenue && formData.annual_revenue < 0) {
      newErrors.annual_revenue = 'Annual revenue cannot be negative'
    }
    
    if (formData.employee_count && formData.employee_count < 0) {
      newErrors.employee_count = 'Employee count cannot be negative'
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
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving account:', error)
      setErrors({ submit: 'Failed to save account. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingAccount ? 'Edit Account' : 'Create New Account'}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingAccount ? 'Edit Account' : 'Create New Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Account Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="Enter account name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <Select
                value={formData.industry || ''}
                onChange={(e) => handleInputChange('industry', e.target.value || null)}
              >
                <option value="">Select an industry</option>
                {industryOptions.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value || null)}
                className={errors.website ? 'border-red-500' : ''}
                placeholder="https://example.com"
              />
              {errors.website && <p className="text-red-500 text-sm mt-1">{errors.website}</p>}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value || null)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="contact@example.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value || null)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <Input
                id="address"
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value || null)}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <Input
                  id="city"
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value || null)}
                  placeholder="New York"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <Input
                  id="state"
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value || null)}
                  placeholder="NY"
                />
              </div>

              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <Input
                  id="postal_code"
                  type="text"
                  value={formData.postal_code || ''}
                  onChange={(e) => handleInputChange('postal_code', e.target.value || null)}
                  placeholder="10001"
                />
              </div>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <Input
                id="country"
                type="text"
                value={formData.country || ''}
                onChange={(e) => handleInputChange('country', e.target.value || null)}
                placeholder="United States"
              />
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="annual_revenue" className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Revenue
                </label>
                <Input
                  id="annual_revenue"
                  type="number"
                  value={formData.annual_revenue || ''}
                  onChange={(e) => handleInputChange('annual_revenue', e.target.value ? parseFloat(e.target.value) : null)}
                  className={errors.annual_revenue ? 'border-red-500' : ''}
                  placeholder="1000000"
                />
                {errors.annual_revenue && <p className="text-red-500 text-sm mt-1">{errors.annual_revenue}</p>}
              </div>

              <div>
                <label htmlFor="employee_count" className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Count
                </label>
                <Input
                  id="employee_count"
                  type="number"
                  value={formData.employee_count || ''}
                  onChange={(e) => handleInputChange('employee_count', e.target.value ? parseInt(e.target.value) : null)}
                  className={errors.employee_count ? 'border-red-500' : ''}
                  placeholder="50"
                />
                {errors.employee_count && <p className="text-red-500 text-sm mt-1">{errors.employee_count}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="prospect">Prospect</option>
              </Select>
            </div>
          </div>

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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}