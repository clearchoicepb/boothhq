'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { AddressInput } from '@/components/ui/address-input'
import { Location, LocationInsert, LocationUpdate } from '@/lib/supabase-client'

interface LocationFormProps {
  location?: Location | null
  isOpen: boolean
  onClose: () => void
  onSave: (location: LocationInsert | LocationUpdate) => Promise<void>
  title?: string
}

export function LocationForm({ 
  location, 
  isOpen, 
  onClose, 
  onSave, 
  title = location ? 'Edit Location' : 'Add New Location' 
}: LocationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    is_one_time: false,
    notes: ''
  })

  // Initialize form data when location changes
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        address_line1: location.address_line1 || '',
        address_line2: location.address_line2 || '',
        city: location.city || '',
        state: location.state || '',
        postal_code: location.postal_code || '',
        country: location.country || 'US',
        contact_name: location.contact_name || '',
        contact_phone: location.contact_phone || '',
        contact_email: location.contact_email || '',
        is_one_time: location.is_one_time || false,
        notes: location.notes || ''
      })
    } else {
      // Reset form for new location
      setFormData({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        is_one_time: false,
        notes: ''
      })
    }
  }, [location, isOpen])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddressChange = (addressData: any) => {
    setFormData(prev => ({
      ...prev,
      address_line1: addressData.address_line1 || '',
      address_line2: addressData.address_line2 || '',
      city: addressData.city || '',
      state: addressData.state || '',
      postal_code: addressData.postal_code || '',
      country: addressData.country || 'US'
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Location name is required')
      return
    }

    setIsLoading(true)
    try {
      console.log('[LocationForm] Submitting location data:', formData)
      await onSave(formData)
      console.log('[LocationForm] onSave completed successfully')
      onClose()
    } catch (error: any) {
      console.error('[LocationForm] Error saving location:', error)
      const errorMessage = error.message || 'Failed to save location. Please try again.'
      alert(`ERROR: ${errorMessage}\n\nCheck console for details.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Community Center, Hotel Ballroom"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_one_time"
              checked={formData.is_one_time}
              onChange={(e) => handleInputChange('is_one_time', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_one_time" className="ml-2 block text-sm text-gray-700">
              One-time location (won't be saved for future use)
            </label>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
          
          <AddressInput
            onAddressChange={handleAddressChange}
            initialAddress={{
              address_line1: formData.address_line1,
              address_line2: formData.address_line2,
              city: formData.city,
              state: formData.state,
              postal_code: formData.postal_code,
              country: formData.country
            }}
          />
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <Input
                id="contact_name"
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleInputChange('contact_name', e.target.value)}
                placeholder="e.g., John Smith"
              />
            </div>

            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes about this location..."
              rows={3}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Saving...' : (location ? 'Update Location' : 'Create Location')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}















