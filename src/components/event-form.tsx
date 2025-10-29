'use client'

import { useState, useEffect } from 'react'
import { accountsApi, contactsApi, opportunitiesApi } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { AccountSelect } from '@/components/account-select'
import { ContactSelect } from '@/components/contact-select'
import { LocationSelect } from '@/components/location-select'
import type { Event, EventInsert, EventUpdate, Account, Contact, Opportunity } from '@/lib/supabase-client'

interface EventFormProps {
  event?: Event | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (event: Event) => void
}

export function EventForm({ event, isOpen, onClose, onSubmit }: EventFormProps) {
  const [formData, setFormData] = useState<EventInsert>({
    tenant_id: '',
    title: '',
    event_type: 'meeting',
    start_date: '',
    end_date: null,
    location: '',
    location_id: null,
    status: 'scheduled',
    account_id: null,
    contact_id: null,
    opportunity_id: null
  })
  const [locationId, setLocationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchRelatedData()
    }
  }, [isOpen])

  useEffect(() => {
    if (event) {
      setFormData({
        tenant_id: event.tenant_id,
        title: event.title || '',
        event_type: event.event_type || 'meeting',
        start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
        end_date: event.end_date || null,
        location: event.location || '',
        location_id: event.location_id || null,
        status: event.status || 'scheduled',
        account_id: event.account_id,
        contact_id: event.contact_id,
        opportunity_id: event.opportunity_id
      })
      setLocationId(event.location_id || null)
    } else {
      // Set default start date to current time
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
      const defaultStartDate = now.toISOString().slice(0, 16)

      setFormData({
        tenant_id: '',
        title: '',
        event_type: 'meeting',
        start_date: defaultStartDate,
        end_date: null,
        location: '',
        location_id: null,
        status: 'scheduled',
        account_id: null,
        contact_id: null,
        opportunity_id: null
      })
      setLocationId(null)
    }
    setErrors({})
  }, [event, isOpen])

  const fetchRelatedData = async () => {
    try {
      const [accountsData, contactsData, opportunitiesData] = await Promise.all([
        accountsApi.getAll(),
        contactsApi.getAll(),
        opportunitiesApi.getAll()
      ])
      
      setAccounts(accountsData)
      setContacts(contactsData)
      setOpportunities(opportunitiesData)
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }

    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date)
      const endDate = new Date(formData.end_date)
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      let result: Event

      if (event) {
        // Update existing event via API route (uses tenant database)
        const updateData: EventUpdate = {
          ...formData,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
        }
        console.log('[EventForm] Updating event via API with data:', updateData)

        const response = await fetch(`/api/events/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to update event')
        }

        result = await response.json()
      } else {
        // Create new event via API route (uses tenant database)
        const insertData: EventInsert = {
          ...formData,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
        }
        console.log('[EventForm] Creating event via API with data:', insertData)

        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(insertData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || errorData.error || 'Failed to create event')
        }

        const responseData = await response.json()
        result = responseData.event || responseData
      }

      console.log('[EventForm] Event saved successfully via API:', result)
      onSubmit(result)
    } catch (error: any) {
      console.error('[EventForm] Error saving event:', error)
      setErrors({ submit: error.message || 'Failed to save event. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof EventInsert, value: string | null) => {
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

  const eventTypeOptions = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'call', label: 'Phone Call' },
    { value: 'demo', label: 'Demo' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'conference', label: 'Conference' },
    { value: 'other', label: 'Other' }
  ]

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' }
  ]

  // Filter contacts and opportunities based on selected account
  const filteredContacts = formData.account_id 
    ? contacts.filter(contact => contact.account_id === formData.account_id)
    : contacts

  const filteredOpportunities = formData.account_id
    ? opportunities.filter(opportunity => opportunity.account_id === formData.account_id)
    : opportunities

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event ? 'Edit Event' : 'Add New Event'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Event Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-300' : ''}
              placeholder="Enter event title"
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Event Type */}
          <div>
            <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <Select
              value={formData.event_type}
              onChange={(e) => handleInputChange('event_type', e.target.value)}
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time *
            </label>
            <Input
              id="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => handleInputChange('start_date', e.target.value)}
              className={errors.start_date ? 'border-red-300' : ''}
            />
            {errors.start_date && <p className="text-red-600 text-sm mt-1">{errors.start_date}</p>}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time
            </label>
            <Input
              id="end_date"
              type="datetime-local"
              value={formData.end_date || ''}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              className={errors.end_date ? 'border-red-300' : ''}
            />
            {errors.end_date && <p className="text-red-600 text-sm mt-1">{errors.end_date}</p>}
          </div>

          {/* Location */}
          <div>
            <LocationSelect
              value={locationId}
              onChange={(locId, location) => {
                console.log('[EventForm] Location changed:', { locId, location })
                setLocationId(locId)
                handleInputChange('location_id', locId)
                // Also set location name in the old field for backward compatibility
                if (location) {
                  handleInputChange('location', location.name)
                } else {
                  handleInputChange('location', '')
                }
              }}
              label="Location"
              placeholder="Select or create location..."
              allowCreate={true}
            />
          </div>

          {/* Account */}
          <div>
            <AccountSelect
              value={formData.account_id}
              onChange={(accountId) => {
                handleInputChange('account_id', accountId)
                // Clear contact if account changes
                if (accountId !== formData.account_id) {
                  handleInputChange('contact_id', null)
                }
              }}
              label="Account"
              placeholder="Search accounts..."
            />
          </div>

          {/* Contact */}
          <div>
            <ContactSelect
              value={formData.contact_id}
              onChange={(contactId) => handleInputChange('contact_id', contactId)}
              accountId={formData.account_id}
              label="Contact"
              placeholder="Search contacts..."
              disabled={!formData.account_id}
            />
            {!formData.account_id && (
              <p className="text-gray-500 text-sm mt-1">Select an account first to see contacts</p>
            )}
          </div>

          {/* Opportunity */}
          <div>
            <label htmlFor="opportunity_id" className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity
            </label>
            <Select
              value={formData.opportunity_id || ''}
              onChange={(e) => handleInputChange('opportunity_id', e.target.value || null)}
              disabled={!formData.account_id}
            >
              <option value="">Select opportunity</option>
              {filteredOpportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.name}
                </option>
              ))}
            </Select>
            {!formData.account_id && (
              <p className="text-gray-500 text-sm mt-1">Select an account first to see opportunities</p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Event description, agenda, or notes"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

