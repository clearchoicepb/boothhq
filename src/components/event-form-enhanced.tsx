'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { SearchableSelect, SearchableOption } from '@/components/ui/searchable-select'
import { Modal } from '@/components/ui/modal'
import { LocationSelector } from '@/components/location-selector'
import { EventCategoryTypeSelector } from '@/components/forms/event-category-type-selector'
import { Calendar, DollarSign, FileText, MapPin, Plus, X, Clock } from 'lucide-react'
import { Event as EventType, EventDate as EventDateType } from '@/lib/supabase-client'
import { toDateInputValue, parseLocalDate } from '@/lib/utils/date-utils'
import toast from 'react-hot-toast'

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

interface Opportunity {
  id: string
  name: string
  account_id: string | null
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
    event_category_id: '',
    event_type_id: '',
    status: 'scheduled',
    date_type: 'single_day',
    converted_from_opportunity_id: opportunityId || '',
    opportunity_id: opportunityId || '',
    account_id: account?.id || '',
    contact_id: contact?.id || '', // Keep for backward compatibility
    primary_contact_id: contact?.id || '', // NEW: Main decision maker
    event_planner_id: '' // NEW: External planner (optional)
  })

  const [eventDates, setEventDates] = useState<EventDateForm[]>([
    { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }
  ])

  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [sharedLocationId, setSharedLocationId] = useState<string>('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        event_type: event.event_type || '',
        event_category_id: event.event_category_id || '',
        event_type_id: event.event_type_id || '',
        status: event.status || 'scheduled',
        date_type: event.date_type || 'single_day',
        converted_from_opportunity_id: opportunityId || '',
        account_id: event.account_id || '',
        contact_id: event.contact_id || '', // Keep for backward compatibility
        primary_contact_id: event.primary_contact_id || event.contact_id || '', // NEW: Load primary contact
        event_planner_id: event.event_planner_id || '' // NEW: Load event planner
      })

      // Load event dates if editing
      if (event.event_dates && Array.isArray(event.event_dates) && event.event_dates.length > 0) {
        setEventDates(event.event_dates.map((ed: any) => ({
          id: ed.id,
          event_date: ed.event_date || '',
          start_time: ed.start_time || '',
          end_time: ed.end_time || '',
          location_id: ed.location_id || '',
          notes: ed.notes || ''
        })))
      } else {
        // Initialize with one empty date for editing events without dates
        setEventDates([{
          event_date: '',
          start_time: '',
          end_time: '',
          location_id: '',
          notes: ''
        }])
      }
    } else {
      // Reset form for new event
      setFormData({
        title: '',
        description: '',
        event_type: '',
        event_category_id: '',
        event_type_id: '',
        status: 'scheduled',
        date_type: 'single_day',
        converted_from_opportunity_id: opportunityId || '',
        account_id: account?.id || '',
        contact_id: contact?.id || ''
      })
      
      // Initialize with one empty date for new events
      setEventDates([{
        event_date: '',
        start_time: '',
        end_time: '',
        location_id: '',
        notes: ''
      }])
    }
  }, [event, isOpen, opportunityId, account, contact])

  // Fetch accounts, contacts, and opportunities for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, contactsRes, opportunitiesRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/contacts'),
          fetch('/api/opportunities')
        ])
        
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData)
        }
        
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json()
          setContacts(contactsData)
        }
        
        if (opportunitiesRes.ok) {
          const opportunitiesData = await opportunitiesRes.json()
          setOpportunities(opportunitiesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  // Filtered and sorted options for dropdowns
  const accountOptions = useMemo<SearchableOption[]>(() => {
    return accounts
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(acc => ({
        id: acc.id,
        label: acc.name,
        subLabel: acc.account_type || undefined
      }))
  }, [accounts])

  const contactOptions = useMemo<SearchableOption[]>(() => {
    if (!formData.account_id) return []
    
    return contacts
      .filter(c => c.account_id === formData.account_id)
      .sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`
        return nameA.localeCompare(nameB)
      })
      .map(c => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        subLabel: c.job_title || c.email || undefined
      }))
  }, [contacts, formData.account_id])

  const eventPlannerOptions = useMemo<SearchableOption[]>(() => {
    return contacts
      .sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`
        return nameA.localeCompare(nameB)
      })
      .map(c => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}`,
        subLabel: c.company || c.job_title || undefined
      }))
  }, [contacts])

  const opportunityOptions = useMemo<SearchableOption[]>(() => {
    if (!formData.account_id) return []
    
    return opportunities
      .filter(o => o.account_id === formData.account_id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(o => ({
        id: o.id,
        label: o.name,
        subLabel: `${o.stage} - $${o.estimated_value || 0}`
      }))
  }, [opportunities, formData.account_id])

  // Auto-update date type based on number of dates
  useEffect(() => {
    // If user adds a second date while in single_day mode, auto-switch to multi_day
    if (eventDates.length > 1 && formData.date_type === 'single_day') {
      setFormData(prev => ({ ...prev, date_type: 'multi_day' }))
    }
  }, [eventDates.length, formData.date_type])

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
    if (!formData.event_category_id) newErrors.event_category_id = 'Event category is required'
    if (!formData.event_type_id) newErrors.event_type_id = 'Event type is required'

    // Get valid dates (dates that have been filled in)
    const validDates = eventDates.filter(d => d.event_date)

    // Validate based on date type
    switch (formData.date_type) {
      case 'single_day':
        if (validDates.length === 0) {
          newErrors.event_date = 'Event date is required'
        } else if (validDates.length > 1) {
          newErrors.event_date = 'Single day events can only have one date'
        }
        if (!eventDates[0]?.event_date) newErrors.event_date = 'Event date is required'
        break

      case 'same_location_sequential':
        if (validDates.length < 2) {
          newErrors.event_dates = 'Sequential events must have at least 2 dates'
        }
        if (!sharedLocationId) {
          newErrors.shared_location = 'Sequential same-location events require a shared location'
        }
        // Check dates are consecutive (no gaps allowed)
        if (validDates.length >= 2 && !newErrors.event_dates) {
          // Use parseLocalDate for timezone-safe parsing
          const sortedDates = validDates
            .map(d => ({
              date: parseLocalDate(d.event_date),
              original: d.event_date
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
          
          console.log('Sequential validation - sorted dates:', sortedDates.map(d => d.original))
          
          for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = sortedDates[i-1].date
            const currDate = sortedDates[i].date
            const diffMs = currDate.getTime() - prevDate.getTime()
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
            
            console.log(`Gap check: ${sortedDates[i-1].original} to ${sortedDates[i].original} = ${diffDays} days`)
            
            if (diffDays !== 1) {
              const prevDateStr = prevDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const currDateStr = currDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              newErrors.event_dates = `Sequential events must have consecutive dates with no gaps. Found ${diffDays}-day gap between ${prevDateStr} and ${currDateStr}`
              break
            }
          }
        }
        // Validate individual dates
        eventDates.forEach((date, index) => {
          if (date.event_date) {
            if (!date.event_date) newErrors[`event_date_${index}`] = `Date ${index + 1} is required`
          }
        })
        break

      case 'same_location_non_sequential':
        if (validDates.length < 2) {
          newErrors.event_dates = 'Non-sequential events must have at least 2 dates'
        }
        if (!sharedLocationId) {
          newErrors.shared_location = 'Same-location events require a shared location'
        }
        break

      case 'multiple_locations':
        if (validDates.length < 2) {
          newErrors.event_dates = 'Multiple location events must have at least 2 dates'
        }
        const uniqueLocations = new Set(validDates.map(d => d.location_id).filter(Boolean))
        if (uniqueLocations.size < 2) {
          newErrors.event_dates = 'Multiple location events must have at least 2 different locations'
        }
        // Validate each date has a location
        eventDates.forEach((date, index) => {
          if (date.event_date && !date.location_id) {
            newErrors[`location_${index}`] = `Location for date ${index + 1} is required`
          }
        })
        break

      default:
        // For any other date type (multi_day, etc.)
        if (validDates.length === 0) {
          newErrors.event_date = 'At least one event date is required'
        }
    }

    setErrors(newErrors)
    
    // Show toast notification for the first error (most important one)
    if (Object.keys(newErrors).length > 0) {
      const firstErrorKey = Object.keys(newErrors)[0]
      const firstErrorMessage = newErrors[firstErrorKey]
      toast.error(firstErrorMessage)
    }
    
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const eventData = {
        ...formData,
        account_id: formData.account_id || null,
        contact_id: formData.primary_contact_id || formData.contact_id || null, // Backward compatibility
        primary_contact_id: formData.primary_contact_id || null, // NEW: Main decision maker
        event_planner_id: formData.event_planner_id || null, // NEW: External planner
        opportunity_id: opportunityId || null,
        start_date: eventDates[0]?.event_date || '',
        end_date: eventDates.length > 1 ? eventDates[eventDates.length - 1]?.event_date : eventDates[0]?.event_date || '',
        event_dates: eventDates.filter(date => date.event_date)
      }

      onSave(eventData)
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to save event. Please try again.')
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
        <div className="space-y-4">
          <div>
            <SearchableSelect
              label="Account"
              placeholder="Search accounts..."
              value={formData.account_id || null}
              onChange={(value) => {
                handleInputChange('account_id', value || '')
                // Reset contact and opportunity when account changes
                if (value !== formData.account_id) {
                  handleInputChange('primary_contact_id', '')
                  handleInputChange('contact_id', '')
                  handleInputChange('opportunity_id', '')
                }
              }}
              options={accountOptions}
              emptyMessage="No accounts found"
            />
            <p className="text-xs text-gray-500 mt-1">
              Who is paying for this event?
            </p>
          </div>

          <div>
            <SearchableSelect
              label="Primary Contact"
              placeholder={formData.account_id ? "Search contacts..." : "Select account first"}
              value={formData.primary_contact_id || null}
              onChange={(value) => {
                handleInputChange('primary_contact_id', value || '')
                handleInputChange('contact_id', value || '') // Backward compatibility
              }}
              options={contactOptions}
              emptyMessage={formData.account_id ? "No contacts for this account" : "Select an account first"}
              required={true}
              disabled={!formData.account_id}
            />
            <p className="text-xs text-gray-500 mt-1">
              Main decision maker at {accounts.find(a => a.id === formData.account_id)?.name || 'the account'}
            </p>
          </div>

          <div>
            <SearchableSelect
              label="Event Planner (Optional)"
              placeholder="Search event planners..."
              value={formData.event_planner_id || null}
              onChange={(value) => handleInputChange('event_planner_id', value || '')}
              options={eventPlannerOptions}
              emptyMessage="No event planners found"
            />
            <p className="text-xs text-gray-500 mt-1">
              External coordinator (wedding planner, corporate event planner, etc.)
            </p>
            {formData.event_planner_id && formData.event_planner_id === formData.primary_contact_id && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> Event planner is same as primary contact
              </p>
            )}
          </div>

          <div>
            <SearchableSelect
              label="Opportunity (Optional)"
              placeholder={formData.account_id ? "Search opportunities..." : "Select account first"}
              value={formData.opportunity_id || null}
              onChange={(value) => handleInputChange('opportunity_id', value || '')}
              options={opportunityOptions}
              emptyMessage={formData.account_id ? "No opportunities for this account" : "Select an account first"}
              disabled={!formData.account_id}
            />
            <p className="text-xs text-gray-500 mt-1">
              Link this event to an opportunity
            </p>
          </div>

          {opportunityId && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                ℹ️ This event was converted from an opportunity
              </p>
            </div>
          )}
        </div>

        {/* Basic Information */}
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

        {/* Event Category & Type */}
        <EventCategoryTypeSelector
          selectedCategoryId={formData.event_category_id}
          selectedTypeId={formData.event_type_id}
          onCategoryChange={(id) => handleInputChange('event_category_id', id)}
          onTypeChange={(id) => handleInputChange('event_type_id', id)}
          required
        />

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
              onChange={(e) => {
                const newDateType = e.target.value
                
                // If switching to single day and have multiple dates, confirm removal
                if (newDateType === 'single_day' && eventDates.length > 1) {
                  const confirmed = window.confirm(
                    'Switching to Single Day Event will remove all dates except the first one. Continue?'
                  )
                  if (confirmed) {
                    setEventDates([eventDates[0]])
                    handleInputChange('date_type', newDateType)
                  }
                } else {
                  handleInputChange('date_type', newDateType)
                }
              }}
            >
              {getDateTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {formData.date_type === 'single_day' && eventDates.length >= 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Single day events can only have one date. Change to "Multi-Day Event" to add more dates.
              </p>
            )}
          </div>
        </div>

        {/* Shared Location for same-location events */}
        {(formData.date_type === 'single_day' || 
          formData.date_type === 'same_location_sequential' || 
          formData.date_type === 'same_location_non_sequential') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Location {formData.date_type !== 'single_day' && '*'}
            </label>
            <LocationSelector
              selectedLocationId={sharedLocationId || null}
              onLocationChange={(locationId) => {
                setSharedLocationId(locationId || '')
                // Auto-populate all event dates with this location
                if (locationId) {
                  setEventDates(prev => prev.map(date => ({
                    ...date,
                    location_id: locationId
                  })))
                }
                // Clear error when location is selected
                if (errors.shared_location) {
                  setErrors(prev => ({ ...prev, shared_location: '' }))
                }
              }}
              placeholder={formData.date_type === 'single_day' 
                ? "Select location (optional)" 
                : "Select location for all dates"}
            />
            {errors.shared_location && (
              <p className="text-red-500 text-xs mt-1">{errors.shared_location}</p>
            )}
            {formData.date_type !== 'single_day' && !errors.shared_location && (
              <p className="text-xs text-gray-500 mt-1">
                All event dates will use this location
              </p>
            )}
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

          {errors.event_dates && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.event_dates}</p>
            </div>
          )}

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
                    value={toDateInputValue(date.event_date)}
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
