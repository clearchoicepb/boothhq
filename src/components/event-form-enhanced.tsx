'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { LocationSelector } from '@/components/location-selector'
import { Calendar, DollarSign, FileText, MapPin, Plus, X, Clock } from 'lucide-react'
import { Event as EventType, EventDate as EventDateType } from '@/lib/supabase-client'

interface Account {
  id: string
  name: string
  email?: string
  phone?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id: string
}


interface EventDateForm {
  id?: string
  event_date: string
  start_time: string
  end_time: string
  location_id?: string
  notes?: string
}


interface EventFormEnhancedProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: any) => void
  account?: Account
  contact?: Contact
  opportunityId?: string
  event?: EventType | null
  title?: string
}

export function EventFormEnhanced({ isOpen, onClose, onSave, account, contact, opportunityId, event, title = 'Create Event' }: EventFormEnhancedProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: '',
    status: 'scheduled',
    date_type: 'single_day',
    mailing_address_line1: '',
    mailing_address_line2: '',
    mailing_city: '',
    mailing_state: '',
    mailing_postal_code: '',
    mailing_country: 'US',
    converted_from_opportunity_id: opportunityId || ''
  })

  const [eventDates, setEventDates] = useState<EventDateForm[]>([
    { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }
  ])


  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_type: event.event_type || '',
        status: event.status || 'scheduled',
        date_type: event.date_type || 'single_day',
        mailing_address_line1: event.mailing_address_line1 || '',
        mailing_address_line2: event.mailing_address_line2 || '',
        mailing_city: event.mailing_city || '',
        mailing_state: event.mailing_state || '',
        mailing_postal_code: event.mailing_postal_code || '',
        mailing_country: event.mailing_country || 'US'
      })
    } else {
      // Reset form for new event
      setFormData({
        title: '',
        description: '',
        event_type: '',
        status: 'scheduled',
        date_type: 'single_day',
        mailing_address_line1: '',
        mailing_address_line2: '',
        mailing_city: '',
        mailing_state: '',
        mailing_postal_code: '',
        mailing_country: 'US'
      })
    }
  }, [event, isOpen])


  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleEventDateChange = (index: number, field: string, value: string) => {
    setEventDates(prev => prev.map((date, i) => 
      i === index ? { ...date, [field]: value } : date
    ))
  }

  const addEventDate = () => {
    setEventDates(prev => [...prev, { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }])
  }

  const removeEventDate = (index: number) => {
    if (eventDates.length > 1) {
      setEventDates(prev => prev.filter((_, i) => i !== index))
    }
  }


  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = 'Event title is required'
    if (!formData.event_type) newErrors.event_type = 'Event type is required'

    // Validate event dates based on date_type
    if (formData.date_type === 'single_day') {
      if (!eventDates[0]?.event_date) newErrors.event_date = 'Event date is required'
      if (!eventDates[0]?.start_time) newErrors.start_time = 'Start time is required'
      if (!eventDates[0]?.end_time) newErrors.end_time = 'End time is required'
    } else {
      eventDates.forEach((date, index) => {
        if (!date.event_date) newErrors[`event_date_${index}`] = `Date ${index + 1} is required`
        if (!date.start_time) newErrors[`start_time_${index}`] = `Start time ${index + 1} is required`
        if (!date.end_time) newErrors[`end_time_${index}`] = `End time ${index + 1} is required`
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const eventData = {
        ...formData,
        account_id: account?.id || null,
        contact_id: contact?.id || null,
        opportunity_id: opportunityId || null,
        start_date: eventDates[0]?.event_date || '',
        end_date: eventDates.length > 1 ? eventDates[eventDates.length - 1]?.event_date : eventDates[0]?.event_date || '',
        event_dates: eventDates.filter(date => date.event_date)
      }

      console.log('Creating event with data:', eventData)
      onSave(eventData)
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDateTypeOptions = () => [
    { value: 'single_day', label: 'Single Day' },
    { value: 'same_location_sequential', label: 'Same Location - Sequential Dates' },
    { value: 'same_location_non_sequential', label: 'Series of Events - Same Location with Non-Sequential Dates' },
    { value: 'multiple_locations', label: 'Multiple Events with Multiple Locations' }
  ]

  const getEventTypeOptions = () => [
    { value: 'wedding', label: 'Wedding' },
    { value: 'corporate', label: 'Corporate Event' },
    { value: 'birthday', label: 'Birthday Party' },
    { value: 'anniversary', label: 'Anniversary' },
    { value: 'graduation', label: 'Graduation' },
    { value: 'holiday', label: 'Holiday Party' },
    { value: 'other', label: 'Other' }
  ]

  const getStatusOptions = () => [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'postponed', label: 'Postponed' }
  ]

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account/Contact Information */}
        {(account || contact) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Event Information</h3>
            {account && <p className="text-sm text-gray-600">Account: {account.name}</p>}
            {contact && <p className="text-sm text-gray-600">Contact: {contact.first_name} {contact.last_name}</p>}
            {opportunityId && <p className="text-sm text-gray-600">Converted from Opportunity</p>}
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter event title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

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
              {getEventTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {errors.event_type && <p className="text-red-500 text-xs mt-1">{errors.event_type}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {getStatusOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Type *
            </label>
            <Select
              value={formData.date_type}
              onChange={(e) => handleInputChange('date_type', e.target.value)}
            >
              {getDateTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Event Dates */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Event Dates *
            </label>
            {formData.date_type !== 'single_day' && (
              <Button
                type="button"
                onClick={addEventDate}
                className="text-xs px-2 py-1"
                variant="outline"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Date
              </Button>
            )}
          </div>

          {eventDates.map((date, index) => (
            <div key={index} className="border rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  {formData.date_type === 'single_day' ? 'Event Date' : `Date ${index + 1}`}
                </h4>
                {formData.date_type !== 'single_day' && eventDates.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeEventDate(index)}
                    className="text-red-600 hover:text-red-700 p-1"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={date.event_date}
                    onChange={(e) => handleEventDateChange(index, 'event_date', e.target.value)}
                    className={errors[`event_date_${index}`] ? 'border-red-500' : ''}
                  />
                  {errors[`event_date_${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`event_date_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Time *
                  </label>
                  <Input
                    type="time"
                    value={date.start_time}
                    onChange={(e) => handleEventDateChange(index, 'start_time', e.target.value)}
                    className={errors[`start_time_${index}`] ? 'border-red-500' : ''}
                  />
                  {errors[`start_time_${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`start_time_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Time *
                  </label>
                  <Input
                    type="time"
                    value={date.end_time}
                    onChange={(e) => handleEventDateChange(index, 'end_time', e.target.value)}
                    className={errors[`end_time_${index}`] ? 'border-red-500' : ''}
                  />
                  {errors[`end_time_${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`end_time_${index}`]}</p>
                  )}
                </div>

                <div>
                  <LocationSelector
                    selectedLocationId={date.location_id || null}
                    onLocationChange={(locationId) => handleEventDateChange(index, 'location_id', locationId || '')}
                    placeholder="Select location for this date"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <Textarea
                  value={date.notes || ''}
                  onChange={(e) => handleEventDateChange(index, 'notes', e.target.value)}
                  placeholder="Additional notes for this date..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mailing Address */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Mailing Address (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Input
                value={formData.mailing_address_line1}
                onChange={(e) => handleInputChange('mailing_address_line1', e.target.value)}
                placeholder="Address Line 1"
              />
            </div>
            <div className="md:col-span-2">
              <Input
                value={formData.mailing_address_line2}
                onChange={(e) => handleInputChange('mailing_address_line2', e.target.value)}
                placeholder="Address Line 2"
              />
            </div>
            <div>
              <Input
                value={formData.mailing_city}
                onChange={(e) => handleInputChange('mailing_city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <Input
                value={formData.mailing_state}
                onChange={(e) => handleInputChange('mailing_state', e.target.value)}
                placeholder="State"
              />
            </div>
            <div>
              <Input
                value={formData.mailing_postal_code}
                onChange={(e) => handleInputChange('mailing_postal_code', e.target.value)}
                placeholder="ZIP Code"
              />
            </div>
            <div>
              <Input
                value={formData.mailing_country}
                onChange={(e) => handleInputChange('mailing_country', e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Additional details about this event..."
            rows={3}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
{isSubmitting ? (event ? 'Updating...' : 'Creating...') : (event ? 'Update Event' : 'Create Event')}
          </Button>
        </div>
      </form>

    </Modal>
  )
}
