'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { contactsApi, accountsApi } from '@/lib/db'
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
    }
  }, [contact, preSelectedAccountId])

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await accountsApi.getAll()
        setAccounts(data)
      } catch (error) {
        console.error('Error fetching accounts:', error)
      }
    }
    fetchAccounts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result: Contact
      if (contact) {
        result = await contactsApi.update(contact.id, formData as ContactUpdate)
      } else {
        result = await contactsApi.create(formData)
      }
      onSubmit(result)
      onClose()
    } catch (error) {
      console.error('Error saving contact:', error)
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
              Account
            </label>
            <select
              value={formData.account_id || ''}
              onChange={(e) => handleChange('account_id', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Select an account"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
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
