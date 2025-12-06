import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events')

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const eventId = params.id

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        accounts!events_account_id_fkey(id, name, email, phone, account_type),
        contacts!events_contact_id_fkey(id, first_name, last_name, email, phone),
        primary_contact:contacts!primary_contact_id(
          id,
          first_name,
          last_name,
          email,
          phone,
          job_title,
          contact_accounts(
            is_primary,
            accounts(id, name)
          )
        ),
        event_planner:contacts!event_planner_id(
          id,
          first_name,
          last_name,
          email,
          phone,
          contact_accounts(
            is_primary,
            accounts(id, name)
          )
        ),
        opportunities!events_opportunity_id_fkey(name),
        event_categories(id, name, slug, color, icon),
        event_types(id, name, slug),
        event_dates(
          id,
          event_date,
          start_time,
          end_time,
          location_id,
          notes,
          status,
          locations(id, name, address_line1, city, state)
        )
      `)
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error, eventId }, 'Failed to fetch event')
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Helper to get company name from contact_accounts
    const getContactCompany = (contact: any) => {
      if (!contact?.contact_accounts) return null
      const primaryAccount = contact.contact_accounts.find((ca: any) => ca.is_primary)
      return primaryAccount?.accounts?.name || contact.contact_accounts[0]?.accounts?.name || null
    }

    // Transform the data to include account_name, contact_name, opportunity_name, and category/type info
    const transformedData = {
      ...data,
      account_name: data.accounts?.name || null,
      // Backward compatibility - use contact_id if primary_contact_id not set
      contact_name: data.contacts ?
        `${data.contacts.first_name} ${data.contacts.last_name}`.trim() : null,
      // New fields for primary contact and event planner
      primary_contact: data.primary_contact ? {
        ...data.primary_contact,
        company: getContactCompany(data.primary_contact)
      } : null,
      primary_contact_name: data.primary_contact ?
        `${data.primary_contact.first_name} ${data.primary_contact.last_name}`.trim() : null,
      event_planner: data.event_planner ? {
        ...data.event_planner,
        company: getContactCompany(data.event_planner)
      } : null,
      event_planner_name: data.event_planner ?
        `${data.event_planner.first_name} ${data.event_planner.last_name}`.trim() : null,
      opportunity_name: data.opportunities?.name || null,
      event_category: data.event_categories || null,
      event_type: data.event_types || null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    log.error({ error }, 'Unexpected error in GET /api/events/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const eventId = params.id
    const body = await request.json()
    log.debug({ eventId, body }, 'Update event request')

    // Extract event_dates and other non-table fields for separate handling
    const {
      event_dates,
      account_name,
      contact_name,
      opportunity_name,
      event_category,
      event_type: eventTypeObj,
      accounts,
      contacts,
      opportunities,
      event_categories,
      event_types,
      ...eventData
    } = body

    // Convert empty strings to null for UUID fields
    const cleanedEventData = Object.entries(eventData).reduce((acc, [key, value]) => {
      // If the value is an empty string and the field name suggests it's an ID, convert to null
      if (value === '' && (key.includes('_id') || key === 'id')) {
        acc[key] = null
      } else {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, any>)

    log.debug({ cleanedEventData }, 'Event data after filtering')

    // Fetch old event_type_id BEFORE update (for workflow trigger detection)
    const { data: oldEvent } = await supabase
      .from('events')
      .select('event_type_id')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    const oldEventTypeId = oldEvent?.event_type_id

    // Update the event
    const { data, error } = await supabase
      .from('events')
      .update(cleanedEventData)
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error, eventId }, 'Failed to update event')
      return NextResponse.json({ error: 'Failed to update event', details: error }, { status: 500 })
    }

    // Trigger workflows if event_type_id was just added or changed
    const newEventTypeId = cleanedEventData.event_type_id
    const eventTypeChanged = newEventTypeId && newEventTypeId !== oldEventTypeId

    if (eventTypeChanged) {
      log.info({ oldEventTypeId, newEventTypeId }, 'Event type changed, triggering workflows')
      
      try {
        const { default: workflowEngine } = await import('@/lib/services/workflowEngine')
        
        const workflowResults = await workflowEngine.executeWorkflowsForEvent({
          eventId: eventId,
          eventTypeId: newEventTypeId,
          tenantId: context.tenantId,
          dataSourceTenantId,
          supabase,
          userId: session.user.id,
        })
        
        if (workflowResults.length > 0) {
          const totalTasks = workflowResults.reduce((sum, result) => sum + result.createdTaskIds.length, 0)
          const totalDesignItems = workflowResults.reduce((sum, result) => sum + result.createdDesignItemIds.length, 0)
          log.info({ 
            workflowCount: workflowResults.length, 
            taskCount: totalTasks, 
            designItemCount: totalDesignItems 
          }, 'Workflows executed successfully')
        } else {
          log.debug({ eventTypeId: newEventTypeId }, 'No active workflows found')
        }
      } catch (error) {
        log.error({ error }, 'Failed to execute workflows')
      }
    }

    // Handle event_dates if provided
    if (event_dates && Array.isArray(event_dates)) {
      // Delete existing event dates
      await supabase
        .from('event_dates')
        .delete()
        .eq('event_id', eventId)
        .eq('tenant_id', dataSourceTenantId)

      // Insert new event dates
      if (event_dates.length > 0) {
        const datesToInsert = event_dates
          .filter((date: any) => date.event_date) // Only insert dates that have an event_date
          .map((date: any) => ({
            tenant_id: dataSourceTenantId,
            event_id: eventId,
            event_date: date.event_date,
            start_time: date.start_time || null,
            end_time: date.end_time || null,
            location_id: date.location_id || null,
            notes: date.notes || null,
            status: 'scheduled'
          }))

        if (datesToInsert.length > 0) {
          const { error: datesError } = await supabase
            .from('event_dates')
            .insert(datesToInsert)

          if (datesError) {
            log.error({ error: datesError }, 'Failed to update event dates')
          }
        }
      }
    }

    log.info({ eventId }, 'Event updated successfully')
    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Unexpected error in PUT /api/events/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const params = await routeContext.params
    const eventId = params.id
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error, eventId }, 'Failed to delete event')
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    // Revalidate the events list page to show deletion immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/${tenantSubdomain}/events`)

    log.info({ eventId }, 'Event deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Unexpected error in DELETE /api/events/[id]')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
