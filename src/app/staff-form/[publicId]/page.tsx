'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FormRenderer } from '@/components/event-forms/FormRenderer'
import { Loader2, AlertCircle, User } from 'lucide-react'
import type { FormField, FormResponses, EventFormStatus } from '@/types/event-forms'
import type { StaffFormStatus } from '@/types/staff-forms'

interface PublicStaffFormData {
  form: {
    id: string
    title: string
    description: string | null
    fields: FormField[]
    status: StaffFormStatus
    responses: FormResponses | null
    completed_at: string | null
  }
  event: {
    title: string
    start_date: string | null
  } | null
  staff: {
    name: string
    role: string | null
  } | null
  tenant: {
    name: string
    logoUrl: string | null
  }
}

/**
 * Public Staff Form Page
 *
 * Accessible at /staff-form/[publicId] without authentication.
 * Allows staff members to view and submit post-event recap forms.
 */
export default function PublicStaffFormPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [formData, setFormData] = useState<PublicStaffFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchForm()
  }, [publicId])

  const fetchForm = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/staff-forms/${publicId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Form not found')
        } else {
          setError('Unable to load form')
        }
        return
      }

      const data = await response.json()
      setFormData(data)
    } catch (err) {
      setError('Unable to load form')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (responses: FormResponses) => {
    const response = await fetch(`/api/public/staff-forms/${publicId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to submit form')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading form...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {error || 'Form Not Found'}
          </h1>
          <p className="text-gray-600">
            This form may have been removed or the link is invalid.
            Please contact your manager for assistance.
          </p>
        </div>
      </div>
    )
  }

  const { form, event, staff, tenant } = formData
  const isCompleted = form.status === 'completed'

  // Map staff form status to event form status for FormRenderer
  const formStatus: EventFormStatus = form.status === 'pending' ? 'draft' : form.status as EventFormStatus

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Card container */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {/* Staff info banner */}
          {staff && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-purple-900">{staff.name}</p>
                  {staff.role && (
                    <p className="text-sm text-purple-700">{staff.role}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Event info banner */}
          {event && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Event:</span> {event.title}
                {event.start_date && (
                  <>
                    {' • '}
                    {new Date(event.start_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Form description */}
          {form.description && (
            <div className="mb-6 text-sm text-gray-600">
              {form.description}
            </div>
          )}

          {/* Form Renderer */}
          <FormRenderer
            name={form.title}
            fields={form.fields}
            responses={form.responses}
            status={formStatus}
            readOnly={isCompleted}
            onSubmit={handleSubmit}
            showSubmitButton={!isCompleted}
            submitButtonText="Submit Recap"
            branding={{
              logoUrl: tenant.logoUrl,
              companyName: tenant.name,
            }}
            formId={form.id}
            formType="staff-forms"
            publicId={publicId}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Powered by BoothHQ
        </div>
      </div>
    </div>
  )
}
