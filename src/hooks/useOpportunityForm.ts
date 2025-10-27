/**
 * Custom hook for managing opportunity form state and logic
 * Encapsulates form data, event dates, validation, and submission
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { parseLocalDate } from '@/lib/utils/date-utils'

interface EventDate {
  id?: string
  event_date: string
  start_time: string
  end_time: string
  location_id?: string
  notes?: string
}

interface FormData {
  name: string
  description: string
  amount: string
  stage: string
  probability: number
  expected_close_date: string
  actual_close_date: string
  event_type: string
  date_type: string
}

interface UseOpportunityFormProps {
  opportunity?: any
  customer?: any
  contact?: any
  selectedAccountId?: string
  selectedContactId?: string
  onSave?: (data: any) => void
  onSubmit?: (data: any) => void
}

export function useOpportunityForm({
  opportunity,
  customer,
  contact,
  selectedAccountId,
  selectedContactId,
  onSave,
  onSubmit
}: UseOpportunityFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    amount: '',
    stage: 'prospecting',
    probability: 50,
    expected_close_date: '',
    actual_close_date: '',
    event_type: '',
    date_type: 'single_day'
  })

  const [eventDates, setEventDates] = useState<EventDate[]>([
    { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }
  ])

  const [sharedLocationId, setSharedLocationId] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (field === 'date_type' && errors.event_dates) {
      setErrors(prev => ({ ...prev, event_dates: '' }))
    }
  }

  const handleEventDateChange = (index: number, field: string, value: string) => {
    setEventDates(prev => prev.map((date, i) =>
      i === index ? { ...date, [field]: value } : date
    ))
    if (errors.event_dates) {
      setErrors(prev => ({ ...prev, event_dates: '' }))
    }
  }

  const addEventDate = () => {
    setEventDates(prev => [...prev, { event_date: '', start_time: '', end_time: '', location_id: '', notes: '' }])
    if (errors.event_dates) {
      setErrors(prev => ({ ...prev, event_dates: '' }))
    }
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

    const validDates = eventDates.filter(date => date.event_date)

    if (validDates.length > 0) {
      if (formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
        if (!sharedLocationId) newErrors.shared_location = 'Location is required when dates are provided'
      }

      if (formData.date_type === 'single_day') {
        if (validDates.length > 1) {
          newErrors.event_date = 'Single day events can only have one date'
        }
      } else if (formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
        if (validDates.length < 2) {
          newErrors.event_dates = `${formData.date_type === 'same_location_sequential' ? 'Sequential' : 'Non-sequential'} events require at least 2 dates`
        }

        if (formData.date_type === 'same_location_sequential' && validDates.length >= 2) {
          const sortedDates = validDates
            .map(d => parseLocalDate(d.event_date))
            .sort((a, b) => a.getTime() - b.getTime())

          for (let i = 1; i < sortedDates.length; i++) {
            const diffDays = Math.round((sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays !== 1) {
              newErrors.event_dates = 'Sequential dates must be consecutive days with no gaps (e.g., Jan 1, Jan 2, Jan 3)'
              toast.error(`Gap detected: ${diffDays} days between dates`)
              break
            }
          }
        }
      } else if (formData.date_type === 'multiple_locations') {
        if (validDates.length < 2) {
          newErrors.event_dates = 'Multiple location events require at least 2 dates'
        }

        const locations = validDates.map(date => date.location_id).filter(loc => loc)
        const uniqueLocations = new Set(locations)

        if (uniqueLocations.size < 2) {
          newErrors.event_dates = 'Multiple location events require at least 2 different locations'
        }

        eventDates.forEach((date, index) => {
          if (!date.event_date) newErrors[`event_date_${index}`] = `Date ${index + 1} is required`
          if (!date.location_id) newErrors[`location_${index}`] = `Location for date ${index + 1} is required`
        })
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      let finalEventDates = eventDates
      if (formData.date_type === 'single_day' || formData.date_type === 'same_location_sequential' || formData.date_type === 'same_location_non_sequential') {
        finalEventDates = eventDates.map(date => ({
          ...date,
          location_id: sharedLocationId || date.location_id
        }))
      }

      const opportunityData = {
        name: formData.name,
        description: formData.description,
        amount: parseFloat(formData.amount) || null,
        stage: formData.stage || 'prospecting',
        probability: parseInt(formData.probability.toString()) || 50,
        expected_close_date: formData.expected_close_date || null,
        actual_close_date: formData.actual_close_date || null,
        event_type: formData.event_type || null,
        date_type: formData.date_type,
        event_dates: finalEventDates.filter(date => date.event_date),
        lead_id: customer?.type === 'lead' ? customer.id : (opportunity?.lead_id || null),
        account_id: customer?.type === 'account' ? customer.id : (selectedAccountId || opportunity?.account_id || null),
        contact_id: contact?.id || (selectedContactId || opportunity?.contact_id || null)
      }

      if (opportunity && onSubmit) {
        await onSubmit(opportunityData)
      } else if (onSave) {
        onSave(opportunityData)
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    formData,
    setFormData,
    eventDates,
    setEventDates,
    sharedLocationId,
    setSharedLocationId,
    errors,
    isSubmitting,
    handleInputChange,
    handleEventDateChange,
    addEventDate,
    removeEventDate,
    validateForm,
    handleSubmit
  }
}
