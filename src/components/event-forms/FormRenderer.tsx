'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FormFieldRenderer, FileUploadField } from './fields'
import { CheckCircle, Loader2, Calendar, Copy } from 'lucide-react'
import type { FormField, FormResponses, EventFormStatus, PerDateResponseValue } from '@/types/event-forms'
import { createLogger } from '@/lib/logger'
import { format } from 'date-fns'

const log = createLogger('event-forms')

/** Event date info for multi-day forms */
interface EventDateInfo {
  id: string
  event_date: string
  start_time?: string | null
  end_time?: string | null
  location_name?: string | null
}

interface FormRendererProps {
  /** Form name/title */
  name: string
  /** Array of form fields to render */
  fields: FormField[]
  /** Existing responses (for viewing completed forms) */
  responses?: FormResponses | null
  /** Form status */
  status?: EventFormStatus
  /** Pre-filled values from merge tags */
  prefilled?: Record<string, string>
  /** Whether form is read-only (completed or preview mode) */
  readOnly?: boolean
  /** Called when form is submitted */
  onSubmit?: (responses: FormResponses) => Promise<void>
  /** Show submit button */
  showSubmitButton?: boolean
  /** Custom submit button text */
  submitButtonText?: string
  /** Tenant branding */
  branding?: {
    logoUrl?: string | null
    companyName?: string
  }
  /** Form ID (needed for file uploads) */
  formId?: string
  /** Form type (needed for file uploads) */
  formType?: 'event-forms' | 'staff-forms'
  /** Public ID (needed for file uploads) */
  publicId?: string
  /** Signed URLs for file uploads (for viewing) */
  signedUrls?: Record<string, string>
  /** Event dates for multi-day events (enables per-date fields) */
  eventDates?: EventDateInfo[]
}

/**
 * FormRenderer Component
 *
 * Renders a complete form for display, preview, or submission.
 * Used by both the preview modal and the public form page.
 */
export function FormRenderer({
  name,
  fields,
  responses: existingResponses,
  status,
  prefilled = {},
  readOnly = false,
  onSubmit,
  showSubmitButton = true,
  submitButtonText = 'Submit',
  branding,
  formId,
  formType = 'event-forms',
  publicId,
  signedUrls = {},
  eventDates = [],
}: FormRendererProps) {
  // Determine if this is a multi-day event with per-date fields
  const isMultiDay = eventDates.length > 1
  const sortedEventDates = useMemo(() =>
    [...eventDates].sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [eventDates]
  )
  const firstDateId = sortedEventDates[0]?.id

  // Separate fields by scope
  const { sharedFields, perDateFields } = useMemo(() => {
    const shared: FormField[] = []
    const perDate: FormField[] = []

    fields.forEach((field) => {
      if (field.scope === 'per_date' && isMultiDay) {
        perDate.push(field)
      } else {
        shared.push(field)
      }
    })

    return {
      sharedFields: shared.sort((a, b) => a.order - b.order),
      perDateFields: perDate.sort((a, b) => a.order - b.order),
    }
  }, [fields, isMultiDay])

  const hasPerDateFields = perDateFields.length > 0 && isMultiDay

  // Track which dates use "same as first date" for each per-date field
  const [sameAsFirstDate, setSameAsFirstDate] = useState<Record<string, Record<string, boolean>>>(() => {
    // fieldId -> { dateId -> boolean }
    const initial: Record<string, Record<string, boolean>> = {}
    perDateFields.forEach((field) => {
      initial[field.id] = {}
      // Start with all dates (except first) checked as "same as first"
      sortedEventDates.forEach((date, index) => {
        if (index > 0) {
          initial[field.id][date.id] = true
        }
      })
    })
    return initial
  })

  // Initialize form values from existing responses or prefilled values
  // For per-date fields, values are stored as { fieldId: { dateId: value } }
  const [formValues, setFormValues] = useState<Record<string, string | string[] | PerDateResponseValue | null>>(() => {
    const initial: Record<string, string | string[] | PerDateResponseValue | null> = {}

    fields.forEach((field) => {
      const isPerDate = field.scope === 'per_date' && isMultiDay

      if (existingResponses?.[field.id] != null) {
        initial[field.id] = existingResponses[field.id] ?? null
      } else if (isPerDate) {
        // Initialize per-date field with empty values for each date
        const perDateValues: PerDateResponseValue = {}
        sortedEventDates.forEach((date) => {
          perDateValues[date.id] = field.type === 'multiselect' ? [] : ''
        })
        initial[field.id] = perDateValues
      } else if (prefilled[field.id]) {
        initial[field.id] = prefilled[field.id]
      } else {
        initial[field.id] = field.type === 'multiselect' ? [] : ''
      }
    })

    return initial
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(status === 'completed')
  const [showThankYou, setShowThankYou] = useState(false)
  const [submittedResponses, setSubmittedResponses] = useState<FormResponses | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-transition from "Thank You" to completed form view after 3 seconds
  useEffect(() => {
    if (showThankYou) {
      const timer = setTimeout(() => {
        setShowThankYou(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showThankYou])

  // Handle field value change (for shared fields)
  const handleFieldChange = useCallback((fieldId: string, value: string | string[]) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }, [errors])

  // Handle per-date field value change
  const handlePerDateFieldChange = useCallback((fieldId: string, dateId: string, value: string | string[]) => {
    setFormValues((prev) => {
      const currentValue = prev[fieldId] as PerDateResponseValue || {}
      return {
        ...prev,
        [fieldId]: {
          ...currentValue,
          [dateId]: value,
        },
      }
    })
    // Clear error when user starts typing
    const errorKey = `${fieldId}_${dateId}`
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }, [errors])

  // Toggle "same as first date" for a per-date field
  const handleSameAsFirstDateChange = useCallback((fieldId: string, dateId: string, checked: boolean) => {
    setSameAsFirstDate((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [dateId]: checked,
      },
    }))
  }, [])

  // Copy first date value to a specific date
  const copyFromFirstDate = useCallback((fieldId: string, dateId: string) => {
    if (!firstDateId) return
    const perDateValue = formValues[fieldId] as PerDateResponseValue
    const firstValue = perDateValue?.[firstDateId]
    if (firstValue !== undefined) {
      handlePerDateFieldChange(fieldId, dateId, firstValue as string | string[])
    }
  }, [formValues, firstDateId, handlePerDateFieldChange])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate shared fields
    sharedFields.forEach((field) => {
      // Skip display-only fields
      if (field.type === 'section' || field.type === 'paragraph') return

      if (field.required) {
        const value = formValues[field.id]
        const isEmpty =
          value === null ||
          value === undefined ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)

        if (isEmpty) {
          newErrors[field.id] = `${field.label} is required`
        }
      }
    })

    // Validate per-date fields
    perDateFields.forEach((field) => {
      // Skip display-only fields
      if (field.type === 'section' || field.type === 'paragraph') return

      if (field.required) {
        sortedEventDates.forEach((date, index) => {
          // If "same as first date" is checked, use first date's value
          const useSameAsFirst = index > 0 && sameAsFirstDate[field.id]?.[date.id]
          const perDateValue = formValues[field.id] as PerDateResponseValue
          const value = useSameAsFirst
            ? perDateValue?.[firstDateId!]
            : perDateValue?.[date.id]

          const isEmpty =
            value === null ||
            value === undefined ||
            value === '' ||
            (Array.isArray(value) && value.length === 0)

          if (isEmpty) {
            const dateLabel = format(new Date(date.event_date + 'T00:00:00'), 'MMM d')
            newErrors[`${field.id}_${date.id}`] = `${field.label} is required for ${dateLabel}`
          }
        })
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [sharedFields, perDateFields, formValues, sortedEventDates, sameAsFirstDate, firstDateId])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (readOnly || !onSubmit) return

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      if (firstErrorField) {
        document.getElementById(`field-${firstErrorField}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
      return
    }

    setIsSubmitting(true)
    try {
      // Build final responses with "same as first date" logic applied
      const responses: FormResponses = {
        _submittedAt: new Date().toISOString(),
      }

      // Add shared field values
      sharedFields.forEach((field) => {
        if (field.type !== 'section' && field.type !== 'paragraph') {
          responses[field.id] = formValues[field.id]
        }
      })

      // Add per-date field values with "same as first" logic applied
      perDateFields.forEach((field) => {
        if (field.type === 'section' || field.type === 'paragraph') return

        const perDateValue = formValues[field.id] as PerDateResponseValue || {}
        const finalPerDateValue: PerDateResponseValue = {}

        sortedEventDates.forEach((date, index) => {
          if (index === 0) {
            // First date always uses its own value
            finalPerDateValue[date.id] = perDateValue[date.id]
          } else if (sameAsFirstDate[field.id]?.[date.id]) {
            // Copy from first date
            finalPerDateValue[date.id] = perDateValue[firstDateId!]
          } else {
            // Use this date's specific value
            finalPerDateValue[date.id] = perDateValue[date.id]
          }
        })

        responses[field.id] = finalPerDateValue
      })

      await onSubmit(responses)
      setSubmittedResponses(responses)
      setIsSubmitted(true)
      setShowThankYou(true)
    } catch (error) {
      log.error({ error }, 'Form submission error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine if we should show the form in read-only mode
  // This happens when: form was already completed (readOnly prop), or just submitted
  const isEffectivelyReadOnly = readOnly || (isSubmitted && !showThankYou)

  // Get the responses to display (either existing or just submitted)
  const displayResponses = submittedResponses || existingResponses

  // Show "Thank You" message briefly after submission
  if (showThankYou) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600">Your response has been submitted successfully.</p>
        <p className="text-sm text-gray-400 mt-4">Showing your submitted responses...</p>
      </div>
    )
  }

  // Helper to render a field
  const renderField = (field: FormField, dateId?: string) => {
    const isPerDate = !!dateId
    const fieldKey = isPerDate ? `${field.id}_${dateId}` : field.id

    // Get value - for per-date fields, extract from the nested object
    let value: string | string[] | null
    if (isPerDate) {
      const perDateValue = formValues[field.id] as PerDateResponseValue
      value = (perDateValue?.[dateId] as string | string[]) ?? (field.type === 'multiselect' ? [] : '')
    } else {
      value = formValues[field.id] as string | string[] | null
    }

    const handleChange = (newValue: string | string[]) => {
      if (isPerDate) {
        handlePerDateFieldChange(field.id, dateId!, newValue)
      } else {
        handleFieldChange(field.id, newValue)
      }
    }

    return (
      <div key={fieldKey} id={`field-${fieldKey}`}>
        {field.type === 'file_upload' && formId && publicId ? (
          <FileUploadField
            field={field}
            value={(value as string) || null}
            onChange={(v) => handleChange(v || '')}
            formId={formId}
            formType={formType}
            publicId={publicId}
            disabled={isEffectivelyReadOnly || isSubmitting}
            preview={isEffectivelyReadOnly}
            signedUrl={signedUrls[field.id] || null}
          />
        ) : (
          <FormFieldRenderer
            field={field}
            value={value}
            onChange={handleChange}
            disabled={isEffectivelyReadOnly || isSubmitting}
          />
        )}
        {errors[fieldKey] && (
          <p className="mt-1 text-sm text-red-600">{errors[fieldKey]}</p>
        )}
      </div>
    )
  }

  // Helper to format date for display
  const formatEventDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Branding Header */}
      {branding?.logoUrl && (
        <div className="flex justify-center mb-6">
          <img
            src={branding.logoUrl}
            alt={branding.companyName || 'Company Logo'}
            className="h-16 w-auto object-contain"
          />
        </div>
      )}

      {/* Form Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{name}</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shared Fields Section */}
        {sharedFields.length > 0 && (
          <div className="space-y-6">
            {hasPerDateFields && (
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
                General Information
              </h2>
            )}
            {sharedFields.map((field) => renderField(field))}
          </div>
        )}

        {/* Per-Date Fields Section */}
        {hasPerDateFields && (
          <div className="space-y-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Date-Specific Information
            </h2>
            <p className="text-sm text-gray-600">
              Please provide information for each date. You can use &quot;Same as first date&quot; to quickly copy values.
            </p>

            {sortedEventDates.map((eventDate, dateIndex) => (
              <div
                key={eventDate.id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                {/* Date Header */}
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <Calendar className="h-5 w-5 text-[#347dc4]" />
                  <h3 className="font-medium text-gray-900">
                    {formatEventDate(eventDate.event_date)}
                  </h3>
                  {dateIndex === 0 && (
                    <span className="ml-auto text-xs bg-[#347dc4] text-white px-2 py-0.5 rounded">
                      Day 1
                    </span>
                  )}
                </div>

                {/* Per-Date Fields for this date */}
                <div className="space-y-4">
                  {perDateFields.map((field) => {
                    // Skip display-only fields
                    if (field.type === 'section' || field.type === 'paragraph') {
                      return renderField(field, eventDate.id)
                    }

                    const isFirstDate = dateIndex === 0
                    const isSameAsFirst = !isFirstDate && sameAsFirstDate[field.id]?.[eventDate.id]

                    return (
                      <div key={`${field.id}_${eventDate.id}`}>
                        {/* Same as first date checkbox (for dates after Day 1) */}
                        {!isFirstDate && !isEffectivelyReadOnly && (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id={`same-${field.id}-${eventDate.id}`}
                              checked={isSameAsFirst}
                              onChange={(e) => handleSameAsFirstDateChange(field.id, eventDate.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-[#347dc4] focus:ring-[#347dc4]"
                            />
                            <label
                              htmlFor={`same-${field.id}-${eventDate.id}`}
                              className="text-sm text-gray-600 cursor-pointer"
                            >
                              Same as Day 1
                            </label>
                            {!isSameAsFirst && (
                              <button
                                type="button"
                                onClick={() => copyFromFirstDate(field.id, eventDate.id)}
                                className="ml-2 text-xs text-[#347dc4] hover:text-[#2a6299] flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                Copy from Day 1
                              </button>
                            )}
                          </div>
                        )}

                        {/* Field (hidden if "same as first" is checked) */}
                        {(!isSameAsFirst || isEffectivelyReadOnly) && renderField(field, eventDate.id)}

                        {/* Show copied value indicator when "same as first" is checked */}
                        {isSameAsFirst && !isEffectivelyReadOnly && (
                          <div className="text-sm text-gray-500 italic bg-gray-100 p-2 rounded">
                            Will use same value as Day 1
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        {showSubmitButton && !isEffectivelyReadOnly && (
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Read-only indicator */}
      {isEffectivelyReadOnly && displayResponses?._submittedAt && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Submitted on{' '}
          {new Date(displayResponses._submittedAt as string).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  )
}

export default FormRenderer
