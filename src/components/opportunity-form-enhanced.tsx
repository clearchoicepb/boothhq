'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { LocationSelector } from '@/components/location-selector'
import { Calendar, DollarSign, FileText, MapPin, Plus, X, Clock } from 'lucide-react'

interface Customer {
  id: string
  name: string
  type: 'lead' | 'account'
  email?: string
  phone?: string
  company?: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  account_id: string
}


interface EventDate {
  id?: string
  event_date: string
  start_time: string
  end_time: string
  location_id?: string
  notes?: string
}

interface OpportunityFormEnhancedProps {
  isOpen?: boolean
  onClose?: () => void
  onSave?: (opportunity: any) => void
  customer?: Customer
  contact?: Contact
  // For editing existing opportunities
  opportunity?: any
  onSubmit?: (opportunity: any) => void
  submitButtonText?: string
  showCancelButton?: boolean
  onCancel?: () => void
}

export function OpportunityFormEnhanced({ 
  isOpen, 
  onClose, 
  onSave, 
  customer, 
  contact,
  opportunity,
  onSubmit,
  submitButtonText = "Create Opportunity",
  showCancelButton = false,
  onCancel
}: OpportunityFormEnhancedProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    stage: 'prospecting',
    probability: 50,
    expected_close_date: '',
    actual_close_date: '',
    event_type: '',
    date_type: 'single_day',
    mailing_address_line1: '',
    mailing_address_line2: '',
    mailing_city: '',
    mailing_state: '',
    mailing_postal_code: '',
    mailing_country: 'US'
  })

  const [eventDates, setEventDates] = useState<EventDate[]>([
    { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }
  ])

  // Shared location for same_location_* types
  const [sharedLocationId, setSharedLocationId] = useState<string>('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when editing existing opportunity
  useEffect(() => {
    if (opportunity) {
      setFormData({
        name: opportunity.name || '',
        description: opportunity.description || '',
        amount: opportunity.amount?.toString() || '',
        stage: opportunity.stage || 'prospecting',
        probability: opportunity.probability || 50,
        expected_close_date: opportunity.expected_close_date || '',
        actual_close_date: opportunity.actual_close_date || '',
        event_type: opportunity.event_type || '',
        date_type: opportunity.date_type || 'single_day',
        mailing_address_line1: opportunity.mailing_address_line1 || '',
        mailing_address_line2: opportunity.mailing_address_line2 || '',
        mailing_city: opportunity.mailing_city || '',
        mailing_state: opportunity.mailing_state || '',
        mailing_postal_code: opportunity.mailing_postal_code || '',
        mailing_country: opportunity.mailing_country || 'US'
      })
      
      // If opportunity has event dates, populate them
      if (opportunity.event_dates && opportunity.event_dates.length > 0) {
        setEventDates(opportunity.event_dates.map((date: any) => ({
          id: date.id,
          event_date: date.event_date || '',
          start_time: date.start_time || '',
          end_time: date.end_time || '',
          location_id: date.location_id || '',
          notes: date.notes || ''
        })))
      }
    }
  }, [opportunity])

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

    if (!formData.name.trim()) newErrors.name = 'Event name is required'
    if (!formData.event_type) newErrors.event_type = 'Event type is required'
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required'

    // Validate shared location for same_location types
    if (formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
      if (!sharedLocationId) newErrors.shared_location = 'Location is required'
    }

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

        // For multiple_locations, validate per-date location
        if (formData.date_type === 'multiple_locations' && !date.location_id) {
          newErrors[`location_${index}`] = `Location for date ${index + 1} is required`
        }
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
      // For single_day and same_location types, populate location_id from shared location
      let finalEventDates = eventDates
      if (formData.date_type === 'single_day' || formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
        finalEventDates = eventDates.map(date => ({
          ...date,
          location_id: sharedLocationId || date.location_id
        }))
      }

      // Only include fields that exist in the current database schema
      const opportunityData = {
        name: formData.name,
        description: formData.description,
        amount: parseFloat(formData.amount) || null,
        stage: formData.stage || 'prospecting',
        probability: parseInt(formData.probability.toString()) || 50,
        expected_close_date: formData.expected_close_date || null,
        actual_close_date: formData.actual_close_date || null,
        date_type: formData.date_type,
        // These fields removed until migrations are run:
        // event_type: formData.event_type || null,
        // event_dates: finalEventDates.filter(date => date.event_date),
        // lead_id: customer?.type === 'lead' ? customer.id : (opportunity?.lead_id || null),
        account_id: customer?.type === 'account' ? customer.id : (opportunity?.account_id || null),
        contact_id: contact?.id || (opportunity?.contact_id || null)
      }

      if (opportunity && onSubmit) {
        // Editing mode
        await onSubmit(opportunityData)
      } else if (onSave) {
        // Creation mode
        onSave(opportunityData)
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
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

  const getStageOptions = () => [
    { value: 'prospecting', label: 'Prospecting' },
    { value: 'qualification', label: 'Qualification' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' }
  ]

  // If this is a modal form and it's not open, return null
  if (isOpen !== undefined && !isOpen) return null

  const formContent = (
    <div className="space-y-8 p-4">
        {/* Customer Information */}
        {customer && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h3>
            <p className="text-sm text-gray-600">
              {customer.type === 'lead' ? 'Lead' : 'Account'}: {customer.name}
              {contact && ` (Contact: ${contact.first_name} ${contact.last_name})`}
            </p>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter event name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage
            </label>
            <Select
              value={formData.stage}
              onChange={(e) => handleInputChange('stage', e.target.value)}
            >
              {getStageOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Date Type Selection */}
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

        {/* Shared Location for single_day and same_location types */}
        {(formData.date_type === 'single_day' || formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Location {formData.date_type !== 'single_day' && '*'}
            </label>
            <LocationSelector
              selectedLocationId={sharedLocationId || null}
              onLocationChange={(locationId) => {
                setSharedLocationId(locationId || '')
                // Clear error when location is selected
                if (errors.shared_location) {
                  setErrors(prev => ({ ...prev, shared_location: '' }))
                }
              }}
              placeholder={formData.date_type === 'single_day' ? "Select location (optional)" : "Select location for all dates"}
            />
            {errors.shared_location && <p className="text-red-500 text-xs mt-1">{errors.shared_location}</p>}
          </div>
        )}

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

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${formData.date_type === 'multiple_locations' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
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

                {/* Only show per-date location selector for multiple_locations type */}
                {formData.date_type === 'multiple_locations' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Location *
                    </label>
                    <LocationSelector
                      selectedLocationId={date.location_id || null}
                      onLocationChange={(locationId) => {
                        handleEventDateChange(index, 'location_id', locationId || '')
                        // Clear error when location is selected
                        if (errors[`location_${index}`]) {
                          setErrors(prev => ({ ...prev, [`location_${index}`]: '' }))
                        }
                      }}
                      placeholder="Select location"
                    />
                    {errors[`location_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`location_${index}`]}</p>
                    )}
                  </div>
                )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            placeholder="Additional details about this opportunity..."
            rows={3}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {showCancelButton && onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          )}
          {!showCancelButton && onClose && (
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitButtonText}
          </Button>
        </div>
      </div>
  )

  // Return modal or direct form content based on props
  if (isOpen !== undefined) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={opportunity ? "Edit Opportunity" : "Create New Opportunity"}>
        {formContent}
      </Modal>
    )
  }

  // Direct form rendering for edit pages
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="max-w-none w-full">
        {formContent}
      </div>
    </div>
  )
}
