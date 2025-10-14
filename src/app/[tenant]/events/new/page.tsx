'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { EventCategoryTypeSelector } from '@/components/forms/event-category-type-selector'
import { LocationSelector } from '@/components/location-selector'
import { ArrowLeft, Save, Calendar, Plus, X, Clock } from 'lucide-react'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  account_type: 'individual' | 'company'
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  account_id: string | null
}

interface Opportunity {
  id: string
  name: string
  account_id: string | null
}

interface EventDate {
  id?: string
  event_date: string
  start_time: string
  end_time: string
  location_id?: string
  notes?: string
}

export default function NewEventPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const router = useRouter()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const [localLoading, setLocalLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_category_id: '',
    event_type_id: '',
    date_type: 'single_day',
    start_date: '',
    end_date: '',
    status: 'scheduled',
    location: '',
    account_id: '',
    contact_id: '',
    opportunity_id: ''
  })
  const [eventDates, setEventDates] = useState<EventDate[]>([
    { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }
  ])
  const [sharedLocationId, setSharedLocationId] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (session && tenant) {
      fetchAccounts()
      fetchContacts()
      fetchOpportunities()
    }
  }, [session, tenant])

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

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/opportunities')
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data || [])
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user changes field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    // Clear event_dates error when date_type changes
    if (field === 'date_type' && errors.event_dates) {
      setErrors(prev => ({ ...prev, event_dates: '' }))
    }
  }

  const handleEventDateChange = (index: number, field: string, value: string) => {
    setEventDates(prev => prev.map((date, i) =>
      i === index ? { ...date, [field]: value } : date
    ))
    // Clear event_dates error when user updates dates
    if (errors.event_dates || errors[`event_date_${index}`] || errors[`start_time_${index}`] || errors[`end_time_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.event_dates
        delete newErrors[`event_date_${index}`]
        delete newErrors[`start_time_${index}`]
        delete newErrors[`end_time_${index}`]
        delete newErrors[`location_${index}`]
        return newErrors
      })
    }
  }

  const addEventDate = () => {
    setEventDates(prev => [...prev, { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }])
    // Clear event_dates error when user adds a date
    if (errors.event_dates) {
      setErrors(prev => ({ ...prev, event_dates: '' }))
    }
  }

  const removeEventDate = (index: number) => {
    if (eventDates.length > 1) {
      setEventDates(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleAccountChange = (accountId: string) => {
    setFormData(prev => ({
      ...prev,
      account_id: accountId,
      contact_id: '', // Reset contact when account changes
      opportunity_id: '' // Reset opportunity when account changes
    }))
  }

  const getFilteredContacts = () => {
    if (!formData.account_id) return contacts
    return contacts.filter(contact => contact.account_id === formData.account_id)
  }

  const getFilteredOpportunities = () => {
    if (!formData.account_id) return opportunities
    return opportunities.filter(opp => opp.account_id === formData.account_id)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = 'Event title is required'
    if (!formData.event_category_id) newErrors.event_category_id = 'Event category is required'
    if (!formData.event_type_id) newErrors.event_type_id = 'Event type is required'

    // Validate shared location for same_location types
    if (formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
      if (!sharedLocationId) newErrors.shared_location = 'Location is required for all dates'
    }

    // Get valid dates (dates that have event_date filled)
    const validDates = eventDates.filter(date => date.event_date)

    // Validate event dates based on date_type
    if (formData.date_type === 'single_day') {
      // Single day: must have exactly 1 date
      if (validDates.length === 0) {
        newErrors.event_date = 'Event date is required'
      } else if (validDates.length > 1) {
        newErrors.event_date = 'Single day events can only have one date'
      }

      if (!eventDates[0]?.event_date) newErrors.event_date = 'Event date is required'
      if (!eventDates[0]?.start_time) newErrors.start_time = 'Start time is required'
      if (!eventDates[0]?.end_time) newErrors.end_time = 'End time is required'
    } else if (formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
      // Same location types: must have at least 2 dates
      if (validDates.length < 2) {
        newErrors.event_dates = `${formData.date_type === 'same_location_sequential' ? 'Sequential' : 'Non-sequential'} events require at least 2 dates`
      }

      // For sequential dates, verify they are actually sequential (no gaps)
      if (formData.date_type === 'same_location_sequential' && validDates.length >= 2) {
        const sortedDates = validDates
          .map(d => new Date(d.event_date))
          .sort((a, b) => a.getTime() - b.getTime())

        for (let i = 1; i < sortedDates.length; i++) {
          const diffDays = Math.floor((sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays !== 1) {
            newErrors.event_dates = 'Sequential dates must be consecutive days with no gaps (e.g., Jan 1, Jan 2, Jan 3)'
            break
          }
        }
      }

      eventDates.forEach((date, index) => {
        if (date.event_date || date.start_time || date.end_time) {
          if (!date.event_date) newErrors[`event_date_${index}`] = `Date ${index + 1} is required`
          if (!date.start_time) newErrors[`start_time_${index}`] = `Start time ${index + 1} is required`
          if (!date.end_time) newErrors[`end_time_${index}`] = `End time ${index + 1} is required`
        }
      })
    } else if (formData.date_type === 'multiple_locations') {
      // Multiple locations: must have at least 2 dates AND at least 2 different locations
      if (validDates.length < 2) {
        newErrors.event_dates = 'Multiple location events require at least 2 dates'
      }

      // Check for at least 2 different locations
      const locations = validDates.map(date => date.location_id).filter(loc => loc)
      const uniqueLocations = new Set(locations)

      if (uniqueLocations.size < 2) {
        newErrors.event_dates = 'Multiple location events require at least 2 different locations'
      }

      eventDates.forEach((date, index) => {
        if (date.event_date || date.start_time || date.end_time || date.location_id) {
          if (!date.event_date) newErrors[`event_date_${index}`] = `Date ${index + 1} is required`
          if (!date.start_time) newErrors[`start_time_${index}`] = `Start time ${index + 1} is required`
          if (!date.end_time) newErrors[`end_time_${index}`] = `End time ${index + 1} is required`
          if (!date.location_id) newErrors[`location_${index}`] = `Location for date ${index + 1} is required`
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setLocalLoading(true)

      // For single_day and same_location types, populate location_id from shared location
      let finalEventDates = eventDates.filter(date => date.event_date)
      if (formData.date_type === 'single_day' || formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
        finalEventDates = finalEventDates.map(date => ({
          ...date,
          location_id: sharedLocationId || date.location_id
        }))
      }

      const eventData = {
        title: formData.title,
        description: formData.description || null,
        event_category_id: formData.event_category_id,
        event_type_id: formData.event_type_id,
        event_type: 'other',
        date_type: formData.date_type,
        start_date: finalEventDates[0]?.event_date || null,
        end_date: finalEventDates.length > 1 ? finalEventDates[finalEventDates.length - 1].event_date : null,
        status: formData.status,
        location: formData.location || null,
        account_id: formData.account_id || null,
        contact_id: formData.contact_id || null,
        opportunity_id: formData.opportunity_id || null,
        event_dates: finalEventDates
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error creating event:', errorData)
        alert(`Error creating event: ${errorData.details || errorData.error}`)
        return
      }

      const { event } = await response.json()

      // Redirect to the event detail page
      router.push(`/${tenantSubdomain}/events/${event.id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating event. Please try again.')
    } finally {
      setLocalLoading(false)
    }
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href={`/${tenantSubdomain}/events`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
                <p className="text-gray-600">Create a new photo booth event</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <EventCategoryTypeSelector
                selectedCategoryId={formData.event_category_id}
                selectedTypeId={formData.event_type_id}
                onCategoryChange={(id) => handleInputChange('event_category_id', id)}
                onTypeChange={(id) => handleInputChange('event_type_id', id)}
                required
              />

              <div>
                <label htmlFor="date_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Type *
                </label>
                <Select
                  id="date_type"
                  value={formData.date_type}
                  onChange={(e) => handleInputChange('date_type', e.target.value)}
                  required
                >
                  <option value="single_day">Single Day</option>
                  <option value="same_location_sequential">Same Location - Sequential Dates</option>
                  <option value="same_location_non_sequential">Series of Events - Same Location with Non-Sequential Dates</option>
                  <option value="multiple_locations">Multiple Events with Multiple Locations</option>
                </Select>
              </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Event Dates *
                  </label>
                  {errors.event_dates && (
                    <p className="text-red-500 text-xs mt-1">{errors.event_dates}</p>
                  )}
                </div>
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
                <div key={index} className="border rounded-lg p-4 mb-3 bg-gray-50">
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

            {/* Status and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Event location or venue"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Event description or details..."
              />
            </div>

            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="account_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Account
                  </label>
                  <select
                    id="account_id"
                    value={formData.account_id}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select an account (optional)</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <select
                    id="contact_id"
                    value={formData.contact_id}
                    onChange={(e) => handleInputChange('contact_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={!formData.account_id}
                  >
                    <option value="">Select a contact (optional)</option>
                    {getFilteredContacts().map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="opportunity_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Opportunity
                  </label>
                  <select
                    id="opportunity_id"
                    value={formData.opportunity_id}
                    onChange={(e) => handleInputChange('opportunity_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    disabled={!formData.account_id}
                  >
                    <option value="">Select an opportunity (optional)</option>
                    {getFilteredOpportunities().map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description/Notes */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description / Notes
              </label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Event details, setup instructions, special requirements, etc..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link href={`/${tenantSubdomain}/events`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={localLoading}>
                {localLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
