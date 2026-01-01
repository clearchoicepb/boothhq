import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import type { FormField, FormResponses } from '@/types/event-forms'

const log = createLogger('api:public:staff-forms')

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
 * GET /api/public/staff-forms/[publicId]
 * Get staff form data for public viewing (no auth required)
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

    // Fetch staff form by public_id
    const { data: form, error: formError } = await supabase
      .from('staff_forms')
      .select(`
        id,
        tenant_id,
        event_id,
        staff_assignment_id,
        title,
        description,
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
      log.error({ error: formError }, 'Staff form not found')
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Don't show pending (unsent) forms publicly
    if (form.status === 'pending') {
      return NextResponse.json({ error: 'Form not available' }, { status: 404 })
    }

    // Fetch event details for context
    const { data: event } = await supabase
      .from('events')
      .select('id, title, start_date')
      .eq('id', form.event_id)
      .single()

    // Fetch staff assignment with user info
    const { data: assignment } = await supabase
      .from('event_staff_assignments')
      .select(`
        id,
        users:user_id (
          first_name,
          last_name
        ),
        staff_roles:staff_role_id (
          name
        )
      `)
      .eq('id', form.staff_assignment_id)
      .single()

    // Fetch tenant branding (logo)
    const { data: logoSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', form.tenant_id)
      .eq('setting_key', 'appearance.logoUrl')
      .single()

    const logoUrl = logoSetting?.setting_value || null

    // Fetch tenant name
    const { data: tenantNameSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', form.tenant_id)
      .eq('setting_key', 'company.name')
      .single()

    const tenantName = tenantNameSetting?.setting_value || 'Our Company'

    // Track first view
    if (!form.viewed_at && form.status === 'sent') {
      await supabase
        .from('staff_forms')
        .update({
          viewed_at: new Date().toISOString(),
          status: 'viewed',
        })
        .eq('id', form.id)
    }

    // Build staff info
    const user = assignment?.users as { first_name: string; last_name: string } | null
    const role = assignment?.staff_roles as { name: string } | null
    const staffName = user ? `${user.first_name} ${user.last_name}` : 'Team Member'
    const staffRole = role?.name || null

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
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
      staff: {
        name: staffName,
        role: staffRole,
      },
      tenant: {
        name: tenantName,
        logoUrl,
      },
    })
  } catch (error) {
    log.error({ error }, 'Error fetching public staff form')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/public/staff-forms/[publicId]
 * Submit staff form responses (no auth required)
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
      .from('staff_forms')
      .select('id, event_id, status, fields, task_id')
      .eq('public_id', publicId)
      .single()

    if (formError || !form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Don't allow submission of pending or already completed forms
    if (form.status === 'pending') {
      return NextResponse.json({ error: 'Form not available' }, { status: 404 })
    }

    if (form.status === 'completed') {
      return NextResponse.json({ error: 'Form already submitted' }, { status: 400 })
    }

    // Add submission metadata
    const formResponses: FormResponses = {
      ...responses,
      _submittedAt: new Date().toISOString(),
    }

    // Update form with responses
    const { error: updateError } = await supabase
      .from('staff_forms')
      .update({
        responses: formResponses,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', form.id)

    if (updateError) {
      log.error({ error: updateError }, 'Error submitting staff form')
      return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
    }

    // Mark linked task as completed if it exists
    if (form.task_id) {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', form.task_id)

      if (taskError) {
        log.warn({ error: taskError, taskId: form.task_id }, 'Failed to mark task as completed')
        // Don't fail the request - form submission was successful
      } else {
        log.info({ taskId: form.task_id }, 'Linked task marked as completed')
      }
    }

    log.info({ formId: form.id }, 'Staff form submitted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error submitting public staff form')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
