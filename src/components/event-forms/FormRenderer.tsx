'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FormFieldRenderer } from './fields'
import { CheckCircle, Loader2 } from 'lucide-react'
import type { FormField, FormResponses, EventFormStatus } from '@/types/event-forms'
import { createLogger } from '@/lib/logger'

const log = createLogger('event-forms')

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
}: FormRendererProps) {
  // Initialize form values from existing responses or prefilled values
  const [formValues, setFormValues] = useState<Record<string, string | string[] | null>>(() => {
    const initial: Record<string, string | string[] | null> = {}

    fields.forEach((field) => {
      if (existingResponses?.[field.id] != null) {
        initial[field.id] = existingResponses[field.id] ?? null
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle field value change
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

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    fields.forEach((field) => {
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [fields, formValues])

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
      const responses: FormResponses = {
        ...formValues,
        _submittedAt: new Date().toISOString(),
      }
      await onSubmit(responses)
      setIsSubmitted(true)
    } catch (error) {
      log.error({ error }, 'Form submission error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submitted state
  if (isSubmitted && !readOnly) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600">Your response has been submitted successfully.</p>
      </div>
    )
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

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
        {sortedFields.map((field) => (
          <div key={field.id} id={`field-${field.id}`}>
            <FormFieldRenderer
              field={field}
              value={formValues[field.id]}
              onChange={(value) => handleFieldChange(field.id, value)}
              disabled={readOnly || isSubmitting}
            />
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
            )}
          </div>
        ))}

        {/* Submit Button */}
        {showSubmitButton && !readOnly && (
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
      {readOnly && status === 'completed' && existingResponses?._submittedAt && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Submitted on{' '}
          {new Date(existingResponses._submittedAt).toLocaleDateString('en-US', {
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
