'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent } from '@/components/ui/card'
import { X, Plus, Trash2, CheckCircle, User } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Account, AccountInsert, AccountUpdate } from '@/lib/supabase-client' // cspell:ignore supabase

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  job_title?: string
  company?: string
}

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
  
  // NEW: State for managing multiple contact relationships
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactRelationships, setContactRelationships] = useState<Array<{
    id?: string // Junction table ID (for edits)
    contact_id: string
    role: string
    is_primary: boolean
    start_date: string
  }>>([
    {
      contact_id: '',
      role: 'Primary Contact',
      is_primary: true,
      start_date: new Date().toISOString().split('T')[0]
    }
  ])

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

  // Fetch contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/contacts')
        if (response.ok) {
          const data = await response.json()
          setContacts(data || [])
        }
      } catch (error) {
        console.error('Error fetching contacts:', error)
      }
    }
    
    if (isOpen) {
      fetchContacts()
    }
  }, [isOpen])

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
      
      // NEW: Load contact relationships if editing
      if (editingAccount.id && isOpen) {
        const fetchRelationships = async () => {
          try {
            const response = await fetch(`/api/accounts/${editingAccount.id}`)
            const data = await response.json()
            
            if (data.contact_accounts && data.contact_accounts.length > 0) {
              setContactRelationships(
                data.contact_accounts.map((ca: any) => ({
                  id: ca.id,
                  contact_id: ca.contact_id,
                  role: ca.role || 'Contact',
                  is_primary: ca.is_primary || false,
                  start_date: ca.start_date || new Date().toISOString().split('T')[0]
                }))
              )
            } else {
              // No junction table entries - start with empty
              setContactRelationships([])
            }
          } catch (error) {
            console.error('Error loading contact relationships:', error)
            setContactRelationships([])
          }
        }
        fetchRelationships()
      }
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
      
      // NEW: Reset relationships for new account
      setContactRelationships([{
        contact_id: '',
        role: 'Primary Contact',
        is_primary: true,
        start_date: new Date().toISOString().split('T')[0]
      }])
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
    
    // NEW: Validate contact relationships (optional for accounts)
    if (contactRelationships.length > 0) {
      // If relationships exist, validate them
      if (contactRelationships.some(rel => !rel.contact_id)) {
        toast.error('Please select a contact for all relationships or remove empty ones')
        return
      }
      
      const primaryCount = contactRelationships.filter(r => r.is_primary).length
      if (primaryCount > 1) {
        toast.error('Only one contact can be marked as primary')
        return
      }
    }
    
    setIsSubmitting(true)
    
    try {
      await onSave(formData)
      
      // NEW: Save contact relationships if account was created/updated
      // We need the account ID, which should be returned from onSave or available from editingAccount
      const accountId = editingAccount?.id
      
      if (accountId && contactRelationships.length > 0) {
        // Save all contact relationships
        for (const rel of contactRelationships) {
          if (rel.contact_id) {
            const relResponse = await fetch('/api/contact-accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contact_id: rel.contact_id,
                account_id: accountId,
                role: rel.role,
                is_primary: rel.is_primary,
                start_date: rel.start_date
              })
            })
            
            if (!relResponse.ok) {
              console.error('Failed to save contact relationship:', await relResponse.text())
            }
          }
        }
      }
      
      toast.success(editingAccount ? 'Account updated!' : 'Account created!')
      onClose()
    } catch (error) {
      console.error('Error saving account:', error)
      toast.error('Failed to save account')
      setErrors({ submit: 'Failed to save account. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingAccount ? 'Edit Account' : 'Create New Account'}>
      <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Contact Associations Section */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Contact Associations</h3>
                <p className="text-sm text-muted-foreground">
                  Link contacts to this account with specific roles (optional)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setContactRelationships([
                    ...contactRelationships,
                    {
                      contact_id: '',
                      role: 'Contact',
                      is_primary: contactRelationships.length === 0,
                      start_date: new Date().toISOString().split('T')[0]
                    }
                  ])
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>

            {/* Contact Relationship Cards */}
            <div className="space-y-3">
              {contactRelationships.map((rel, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Contact Selector */}
                      <div>
                        <label className="text-sm font-medium">
                          Contact
                        </label>
                        <select
                          value={rel.contact_id}
                          onChange={(e) => {
                            const updated = [...contactRelationships]
                            updated[index].contact_id = e.target.value
                            setContactRelationships(updated)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          aria-label={`Select contact for relationship ${index + 1}`}
                        >
                          <option value="">Select contact</option>
                          {contacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.first_name} {contact.last_name}
                              {contact.job_title && ` - ${contact.job_title}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Role Selector */}
                      <div>
                        <label className="text-sm font-medium">Role</label>
                        <select
                          value={rel.role}
                          onChange={(e) => {
                            const updated = [...contactRelationships]
                            updated[index].role = e.target.value
                            setContactRelationships(updated)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          aria-label={`Select role for relationship ${index + 1}`}
                        >
                          <option value="Primary Contact">Primary Contact</option>
                          <option value="Employee">Employee</option>
                          <option value="Event Planner">Event Planner</option>
                          <option value="Wedding Planner">Wedding Planner</option>
                          <option value="Billing Contact">Billing Contact</option>
                          <option value="Decision Maker">Decision Maker</option>
                          <option value="Former Employee">Former Employee</option>
                          <option value="Contractor">Contractor</option>
                        </select>
                      </div>
                    </div>

                    {/* Primary Toggle & Remove Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`primary-contact-${index}`}
                          checked={rel.is_primary}
                          onChange={(e) => {
                            const updated = contactRelationships.map((r, i) => ({
                              ...r,
                              is_primary: i === index ? e.target.checked : false
                            }))
                            setContactRelationships(updated)
                          }}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`primary-contact-${index}`} className="text-sm">
                          Primary Contact
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setContactRelationships(
                            contactRelationships.filter((_, i) => i !== index)
                          )
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {rel.is_primary && (
                      <p className="text-sm text-blue-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        This is the primary contact for this account
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {contactRelationships.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No contacts associated yet</p>
                  <p className="text-sm">Click "Add Contact" to create a relationship</p>
                </CardContent>
              </Card>
            )}
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
    </Modal>
  )
}