'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { AccountSelect } from '@/components/account-select'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Plus, Trash2, CheckCircle, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
// Remove the db import - we'll use API routes instead
import type { Contact, ContactInsert, ContactUpdate, Account } from '@/lib/supabase-client'

interface ContactFormProps {
  contact?: Contact
  isOpen: boolean
  onClose: () => void
  onSubmit: (contact: Contact) => void
  preSelectedAccountId?: string | null
}

export function ContactForm({ contact, isOpen, onClose, onSubmit, preSelectedAccountId }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactInsert>({
    tenant_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    account_id: null,
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    status: 'active',
    avatar_url: null
  })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  
  // NEW: State for managing multiple account relationships
  const [accountRelationships, setAccountRelationships] = useState<Array<{
    id?: string // Junction table ID (for edits)
    account_id: string
    role: string
    is_primary: boolean
    start_date: string
  }>>([
    {
      account_id: preSelectedAccountId || '',
      role: 'Primary Contact',
      is_primary: true,
      start_date: new Date().toISOString().split('T')[0]
    }
  ])

  useEffect(() => {
    if (contact) {
      setFormData({
        tenant_id: contact.tenant_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || '',
        phone: contact.phone || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        account_id: contact.account_id,
        address_line_1: contact.address_line_1 || '',
        address_line_2: contact.address_line_2 || '',
        city: contact.city || '',
        state: contact.state || '',
        zip_code: contact.zip_code || '',
        status: contact.status,
        avatar_url: contact.avatar_url
      })
      
      // NEW: Load account relationships if editing
      if (contact.id && isOpen) {
        const fetchRelationships = async () => {
          try {
            const response = await fetch(`/api/contacts/${contact.id}`)
            const data = await response.json()
            
            if (data.contact_accounts && data.contact_accounts.length > 0) {
              setAccountRelationships(
                data.contact_accounts.map((ca: any) => ({
                  id: ca.id,
                  account_id: ca.account_id,
                  role: ca.role || 'Contact',
                  is_primary: ca.is_primary || false,
                  start_date: ca.start_date || new Date().toISOString().split('T')[0]
                }))
              )
            } else if (contact.account_id) {
              // Fallback: Use old account_id if no junction table entries
              setAccountRelationships([{
                account_id: contact.account_id,
                role: 'Primary Contact',
                is_primary: true,
                start_date: new Date().toISOString().split('T')[0]
              }])
            } else {
              setAccountRelationships([])
            }
          } catch (error) {
            console.error('Error loading account relationships:', error)
            // Fallback to old account_id
            if (contact.account_id) {
              setAccountRelationships([{
                account_id: contact.account_id,
                role: 'Primary Contact',
                is_primary: true,
                start_date: new Date().toISOString().split('T')[0]
              }])
            }
          }
        }
        fetchRelationships()
      }
    } else {
      setFormData({
        tenant_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        department: '',
        account_id: preSelectedAccountId || null,
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: '',
        status: 'active',
        avatar_url: null
      })
      
      // NEW: Reset relationships for new contact
      if (preSelectedAccountId) {
        setAccountRelationships([{
          account_id: preSelectedAccountId,
          role: 'Primary Contact',
          is_primary: true,
          start_date: new Date().toISOString().split('T')[0]
        }])
      } else {
        setAccountRelationships([])
      }
    }
  }, [contact, preSelectedAccountId, isOpen])

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts')
        if (response.ok) {
          const data = await response.json()
          setAccounts(data || [])
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      }
    }
    fetchAccounts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // NEW: Validate account relationships
    if (accountRelationships.length === 0) {
      toast.error('Contact must be associated with at least one account')
      return
    }
    
    if (accountRelationships.some(rel => !rel.account_id)) {
      toast.error('Please select an account for all relationships')
      return
    }
    
    const primaryCount = accountRelationships.filter(r => r.is_primary).length
    if (primaryCount > 1) {
      toast.error('Only one account can be marked as primary')
      return
    }
    
    setLoading(true)

    try {
      let result: Contact
      if (contact) {
        // Update existing contact
        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to update contact')
        }
        
        result = await response.json()
      } else {
        // Create new contact
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
        
        if (!response.ok) {
          throw new Error('Failed to create contact')
        }
        
        result = await response.json()
      }
      
      // NEW: Save account relationships
      const finalContactId = contact?.id || result.id
      
      // Save all account relationships
      for (const rel of accountRelationships) {
        if (rel.account_id) {
          const relResponse = await fetch('/api/contact-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: finalContactId,
              account_id: rel.account_id,
              role: rel.role,
              is_primary: rel.is_primary,
              start_date: rel.start_date
            })
          })
          
          if (!relResponse.ok) {
            console.error('Failed to save account relationship:', await relResponse.text())
          }
        }
      }
      
      toast.success(contact ? 'Contact updated!' : 'Contact created!')
      onSubmit(result)
      onClose()
    } catch (error) {
      console.error('Error saving contact:', error)
      toast.error('Failed to save contact')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ContactInsert, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? 'Edit Contact' : 'Add New Contact'}
      className="sm:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
          <PhotoUpload
            currentPhotoUrl={formData.avatar_url}
            onPhotoChange={(photoUrl) => setFormData(prev => ({ ...prev, avatar_url: photoUrl }))}
            entityType="contact"
            entityName={`${formData.first_name} ${formData.last_name}`.trim() || 'Contact'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <Input
              required
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <Input
              required
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value || null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value || null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <Input
              value={formData.job_title || ''}
              onChange={(e) => handleChange('job_title', e.target.value || null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <Input
              value={formData.department || ''}
              onChange={(e) => handleChange('department', e.target.value || null)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Select status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Address
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Address Line 1
                </label>
                <Input
                  value={formData.address_line_1 || ''}
                  onChange={(e) => handleChange('address_line_1', e.target.value || null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Address Line 2
                </label>
                <Input
                  value={formData.address_line_2 || ''}
                  onChange={(e) => handleChange('address_line_2', e.target.value || null)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    City
                  </label>
                  <Input
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value || null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    State
                  </label>
                  <Input
                    value={formData.state || ''}
                    onChange={(e) => handleChange('state', e.target.value || null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Zip Code
                  </label>
                  <Input
                    value={formData.zip_code || ''}
                    onChange={(e) => handleChange('zip_code', e.target.value || null)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          </div>
        </div>

        {/* Account Associations Section */}
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Account Associations</h3>
              <p className="text-sm text-muted-foreground">
                Link this contact to one or more accounts with specific roles
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAccountRelationships([
                  ...accountRelationships,
                  {
                    account_id: '',
                    role: 'Contact',
                    is_primary: accountRelationships.length === 0,
                    start_date: new Date().toISOString().split('T')[0]
                  }
                ])
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>

          {/* Account Relationship Cards */}
          <div className="space-y-3">
            {accountRelationships.map((rel, index) => (
              <Card key={index}>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Selector */}
                    <div>
                      <label className="text-sm font-medium">
                        Account {index === 0 && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        value={rel.account_id}
                        onChange={(e) => {
                          const updated = [...accountRelationships]
                          updated[index].account_id = e.target.value
                          setAccountRelationships(updated)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required={index === 0}
                        aria-label={`Select account for relationship ${index + 1}`}
                      >
                        <option value="">Select account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                            {account.account_type && ` (${account.account_type})`}
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
                          const updated = [...accountRelationships]
                          updated[index].role = e.target.value
                          setAccountRelationships(updated)
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
                        id={`primary-${index}`}
                        checked={rel.is_primary}
                        onChange={(e) => {
                          const updated = accountRelationships.map((r, i) => ({
                            ...r,
                            is_primary: i === index ? e.target.checked : false
                          }))
                          setAccountRelationships(updated)
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`primary-${index}`} className="text-sm">
                        Primary Account
                      </label>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAccountRelationships(
                          accountRelationships.filter((_, i) => i !== index)
                        )
                      }}
                      disabled={accountRelationships.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {rel.is_primary && (
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      This is the primary account for this contact
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {accountRelationships.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No accounts associated yet</p>
                <p className="text-sm">Click "Add Account" to create a relationship</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (contact ? 'Update Contact' : 'Create Contact')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
