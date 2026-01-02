import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, updateWithTenantId } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'
import type { CopyStaffFormResponsesRequest } from '@/types/staff-forms'

const log = createLogger('api:staff-forms:copy-from-first')

/**
 * POST /api/staff-forms/copy-from-first
 * Copy Day 1 responses to all other dates for a staff member
 * Used after submitting the first date's form to quickly fill in the rest
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const body: CopyStaffFormResponsesRequest = await request.json()

    // Validate required fields
    if (!body.event_id || !body.staff_assignment_id) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, staff_assignment_id' },
        { status: 400 }
      )
    }

    // Fetch all staff forms for this assignment on this event, ordered by date
    const { data: forms, error: formsError } = await supabase
      .from('staff_forms')
      .select(`
        id,
        event_date_id,
        responses,
        status,
        task_id,
        event_date:event_dates (
          id,
          event_date
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', body.event_id)
      .eq('staff_assignment_id', body.staff_assignment_id)
      .not('event_date_id', 'is', null)
      .order('created_at', { ascending: true })

    if (formsError) {
      log.error({ error: formsError }, 'Failed to fetch staff forms')
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
    }

    if (!forms || forms.length === 0) {
      return NextResponse.json(
        { error: 'No forms found for this staff member on this event' },
        { status: 404 }
      )
    }

    // Sort by event_date to ensure we get the first date
    const sortedForms = [...forms].sort((a, b) => {
      const dateA = (a.event_date as any)?.event_date || ''
      const dateB = (b.event_date as any)?.event_date || ''
      return dateA.localeCompare(dateB)
    })

    // Find the first completed form (Day 1)
    const firstForm = sortedForms.find(f => f.status === 'completed' && f.responses)
    if (!firstForm) {
      return NextResponse.json(
        { error: 'No completed form found to copy from. Complete the first date\'s form first.' },
        { status: 400 }
      )
    }

    // Get forms to copy to (all other forms that aren't completed)
    const formsToUpdate = sortedForms.filter(f =>
      f.id !== firstForm.id && f.status !== 'completed'
    )

    if (formsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All forms are already completed',
        copied: 0,
      })
    }

    // Copy responses to each form
    const now = new Date().toISOString()
    let copiedCount = 0
    const errors: { formId: string; error: string }[] = []

    for (const form of formsToUpdate) {
      try {
        // Update the form with copied responses
        const { error: updateError } = await updateWithTenantId(
          supabase,
          'staff_forms',
          form.id,
          {
            responses: {
              ...firstForm.responses,
              _submittedAt: now,
              _copiedFrom: firstForm.id,
            },
            status: 'completed',
            completed_at: now,
          },
          dataSourceTenantId,
          session.user.id
        )

        if (updateError) {
          log.error({ error: updateError, formId: form.id }, 'Failed to update form')
          errors.push({ formId: form.id, error: updateError.message })
          continue
        }

        // Mark the linked task as completed if exists
        if (form.task_id) {
          const { error: taskError } = await updateWithTenantId(
            supabase,
            'tasks',
            form.task_id,
            {
              status: 'completed',
              completed_at: now,
            },
            dataSourceTenantId,
            session.user.id
          )

          if (taskError) {
            log.warn({ error: taskError, taskId: form.task_id }, 'Failed to complete task')
            // Don't fail the whole operation for task error
          }
        }

        copiedCount++
      } catch (err) {
        log.error({ error: err, formId: form.id }, 'Error copying form responses')
        errors.push({ formId: form.id, error: 'Unknown error' })
      }
    }

    log.info(
      { eventId: body.event_id, assignmentId: body.staff_assignment_id, copied: copiedCount, errors: errors.length },
      'Staff form responses copied'
    )

    return NextResponse.json({
      success: true,
      copied: copiedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: copiedCount > 0
        ? `Copied responses to ${copiedCount} form${copiedCount > 1 ? 's' : ''}`
        : 'No forms needed updating',
    })
  } catch (error) {
    log.error({ error }, 'Staff forms copy error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
