import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { resolveFormPrefillValues } from '@/lib/event-forms/merge-field-resolver'
import { saveFormResponsesToEventData } from '@/lib/event-forms/form-response-saver'
import { createNotification } from '@/lib/services/notificationService'
import type { FormField, FormResponses } from '@/types/event-forms'

const log = createLogger('api:public:forms')

// We need to use the default tenant database client for public access
// since we don't have a session
async function getPublicSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js')

  const url = process.env.DEFAULT_TENANT_DATA_URL!
  const serviceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * GET /api/public/forms/[publicId]
 * Get form data for public viewing (no auth required)
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ publicId: string }> }
) {
  try {
    const params = await routeContext.params
    const { publicId } = params

    if (!publicId || publicId.length < 8) {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 })
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch form by public_id
    const { data: form, error: formError } = await supabase
      .from('event_forms')
      .select(`
        id,
        tenant_id,
        event_id,
        name,
        fields,
        responses,
        status,
        public_id,
        viewed_at,
        completed_at
      `)
      .eq('public_id', publicId)
      .single()

    if (formError || !form) {
      log.error({ error: formError }, 'Form not found')
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Don't show draft forms publicly
    if (form.status === 'draft') {
      return NextResponse.json({ error: 'Form not available' }, { status: 404 })
    }

    // Fetch event details for context
    const { data: event } = await supabase
      .from('events')
      .select('id, title, start_date')
      .eq('id', form.event_id)
      .single()

    // Fetch event dates for multi-day support
    let eventDates: { id: string; event_date: string; start_time: string | null; end_time: string | null; location_name: string | null }[] = []
    if (event?.id) {
      const { data: dates } = await supabase
        .from('event_dates')
        .select(`
          id,
          event_date,
          start_time,
          end_time,
          location:locations (
            name
          )
        `)
        .eq('event_id', event.id)
        .order('event_date', { ascending: true })

      if (dates && dates.length > 0) {
        eventDates = dates.map((d) => ({
          id: d.id,
          event_date: d.event_date,
          start_time: d.start_time,
          end_time: d.end_time,
          location_name: (d.location as { name: string } | null)?.name || null,
        }))
      }
    }

    const isMultiDay = eventDates.length > 1

    // Fetch tenant branding (logo)
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', form.tenant_id)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    const logoUrl = logoSetting?.setting_value || null

    // Track first view
    if (!form.viewed_at && form.status === 'sent') {
      await supabase
        .from('event_forms')
        .update({
          viewed_at: new Date().toISOString(),
          status: 'viewed',
        })
        .eq('id', form.id)
    }

    // Resolve pre-populated values from merge field mappings
    const fields = (form.fields || []) as FormField[]
    let prefilled: Record<string, string> = {}

    try {
      prefilled = await resolveFormPrefillValues(supabase, form.event_id, fields)
      log.debug({ fieldCount: Object.keys(prefilled).length }, 'Resolved prefill values')
    } catch (prefillError) {
      log.error({ error: prefillError }, 'Error resolving prefill values')
      // Continue without prefilled values - non-critical error
    }

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        fields: form.fields || [],
        status: form.status,
        responses: form.responses,
        completed_at: form.completed_at,
      },
      event: event
        ? {
            title: event.title,
            start_date: event.start_date,
          }
        : null,
      // Multi-day event support
      isMultiDay,
      eventDates: isMultiDay ? eventDates : undefined,
      tenant: {
        logoUrl,
      },
      prefilled,
    })
  } catch (error) {
    log.error({ error }, 'Error fetching public form')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/public/forms/[publicId]
 * Submit form responses (no auth required)
 */
export async function POST(
  request: NextRequest,
  routeContext: { params: Promise<{ publicId: string }> }
) {
  try {
    const params = await routeContext.params
    const { publicId } = params
    const body = await request.json()

    if (!publicId || publicId.length < 8) {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 })
    }

    const { responses } = body

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'Responses are required' }, { status: 400 })
    }

    const supabase = await getPublicSupabaseClient()

    // Fetch form to verify it exists and is submittable
    const { data: form, error: formError } = await supabase
      .from('event_forms')
      .select('id, event_id, status, fields, tenant_id, name')
      .eq('public_id', publicId)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Don't allow submission of draft or already completed forms
    if (form.status === 'draft') {
      return NextResponse.json({ error: 'Form not available' }, { status: 404 })
    }

    if (form.status === 'completed') {
      return NextResponse.json({ error: 'Form already submitted' }, { status: 400 })
    }

    // Add submission metadata
    const formResponses = {
      ...responses,
      _submittedAt: new Date().toISOString(),
    }

    // Update form with responses
    const { error: updateError } = await supabase
      .from('event_forms')
      .update({
        responses: formResponses,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', form.id)

    if (updateError) {
      log.error({ error: updateError }, 'Error submitting form')
      return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
    }

    // Send notification to relevant staff (non-blocking)
    try {
      // Get event title for notification message
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', form.event_id)
        .single()

      // Find tasks related to this event to determine who to notify
      // Notify users who have tasks assigned for this event
      const { data: eventTasks } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('entity_type', 'event')
        .eq('entity_id', form.event_id)
        .not('assigned_to', 'is', null)

      if (eventTasks && eventTasks.length > 0) {
        // Get unique assignees
        const uniqueAssignees = [...new Set(eventTasks.map((t) => t.assigned_to))]

        // Create notification for each assignee
        for (const assigneeId of uniqueAssignees) {
          if (assigneeId) {
            await createNotification({
              supabase,
              tenantId: form.tenant_id,
              userId: assigneeId,
              type: 'form_completed',
              title: `${form.name} completed`,
              message: `Form submitted for ${event?.title || 'event'}`,
              entityType: 'event',
              entityId: form.event_id,
              linkUrl: `/events/${form.event_id}`,
              actorName: 'Client',
            })
          }
        }
      }
    } catch (notifyError) {
      // Log but don't fail - notification is not critical
      log.error({ error: notifyError }, 'Error sending form completion notifications')
    }

    // Apply save-back mappings to update event data
    const fields = (form.fields || []) as FormField[]
    const hasSaveBackMappings = fields.some(f => f.saveResponseTo)

    if (hasSaveBackMappings && form.event_id) {
      try {
        const saveBackResult = await saveFormResponsesToEventData(
          supabase,
          form.event_id,
          fields,
          formResponses as FormResponses
        )

        if (!saveBackResult.success) {
          log.warn(
            { errors: saveBackResult.errors },
            'Some save-back updates failed (form still submitted successfully)'
          )
        } else if (saveBackResult.updatedTables.length > 0) {
          log.info(
            { tables: saveBackResult.updatedTables },
            'Successfully applied save-back updates'
          )
        }
      } catch (saveBackError) {
        // Log but don't fail the request - form submission was successful
        log.error({ error: saveBackError }, 'Error applying save-back mappings')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error submitting public form')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
