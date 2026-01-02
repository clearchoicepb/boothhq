import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:contacts:merge')

interface MergeContactsRequest {
  survivorId: string        // The contact that will remain
  victimId: string          // The contact that will be deleted
  mergedData: Record<string, unknown>  // The field values to use for the survivor
  notes?: string            // Optional notes about why this merge was done
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body: MergeContactsRequest = await request.json()
    const { survivorId, victimId, mergedData, notes } = body

    // Validate input
    if (!survivorId || !victimId) {
      return NextResponse.json(
        { error: 'Both survivorId and victimId are required' },
        { status: 400 }
      )
    }

    if (survivorId === victimId) {
      return NextResponse.json(
        { error: 'Cannot merge a contact with itself' },
        { status: 400 }
      )
    }

    log.info({ survivorId, victimId }, 'Starting contact merge')

    // 1. Fetch both contacts to verify they exist and belong to this tenant
    const [survivorResult, victimResult] = await Promise.all([
      supabase
        .from('contacts')
        .select('*')
        .eq('id', survivorId)
        .eq('tenant_id', dataSourceTenantId)
        .single(),
      supabase
        .from('contacts')
        .select('*')
        .eq('id', victimId)
        .eq('tenant_id', dataSourceTenantId)
        .single()
    ])

    if (survivorResult.error || !survivorResult.data) {
      log.error({ error: survivorResult.error, survivorId }, 'Survivor contact not found')
      return NextResponse.json(
        { error: 'Survivor contact not found' },
        { status: 404 }
      )
    }

    if (victimResult.error || !victimResult.data) {
      log.error({ error: victimResult.error, victimId }, 'Victim contact not found')
      return NextResponse.json(
        { error: 'Victim contact not found' },
        { status: 404 }
      )
    }

    const survivor = survivorResult.data
    const victim = victimResult.data

    // Track transferred data counts
    const transferredData: Record<string, number> = {}

    // 2. Update survivor with merged data
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        ...mergedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', survivorId)
      .eq('tenant_id', dataSourceTenantId)

    if (updateError) {
      log.error({ error: updateError }, 'Failed to update survivor contact')
      return NextResponse.json(
        { error: 'Failed to update survivor contact', details: updateError.message },
        { status: 500 }
      )
    }

    // 3. Reassign all related data from victim to survivor

    // 3a. Reassign events
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (eventsError) {
      log.error({ error: eventsError }, 'Failed to reassign events')
    } else {
      transferredData.events = eventsData?.length || 0
    }

    // 3b. Reassign events where victim is primary_contact_id
    const { data: primaryContactEventsData, error: primaryContactEventsError } = await supabase
      .from('events')
      .update({ primary_contact_id: survivorId })
      .eq('primary_contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (primaryContactEventsError) {
      log.error({ error: primaryContactEventsError }, 'Failed to reassign primary contact events')
    } else {
      transferredData.primary_contact_events = primaryContactEventsData?.length || 0
    }

    // 3c. Reassign events where victim is event_planner_id
    const { data: eventPlannerEventsData, error: eventPlannerEventsError } = await supabase
      .from('events')
      .update({ event_planner_id: survivorId })
      .eq('event_planner_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (eventPlannerEventsError) {
      log.error({ error: eventPlannerEventsError }, 'Failed to reassign event planner events')
    } else {
      transferredData.event_planner_events = eventPlannerEventsData?.length || 0
    }

    // 3d. Reassign opportunities
    const { data: oppsData, error: oppsError } = await supabase
      .from('opportunities')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (oppsError) {
      log.error({ error: oppsError }, 'Failed to reassign opportunities')
    } else {
      transferredData.opportunities = oppsData?.length || 0
    }

    // 3e. Reassign invoices
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (invoicesError) {
      log.error({ error: invoicesError }, 'Failed to reassign invoices')
    } else {
      transferredData.invoices = invoicesData?.length || 0
    }

    // 3f. Reassign tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (tasksError) {
      log.error({ error: tasksError }, 'Failed to reassign tasks')
    } else {
      transferredData.tasks = tasksData?.length || 0
    }

    // 3g. Reassign notes
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (notesError) {
      log.error({ error: notesError }, 'Failed to reassign notes')
    } else {
      transferredData.notes = notesData?.length || 0
    }

    // 3h. Merge contact_accounts (junction table)
    // First, get victim's account relationships
    const { data: victimAccounts } = await supabase
      .from('contact_accounts')
      .select('*')
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)

    // Get survivor's existing accounts
    const { data: survivorAccounts } = await supabase
      .from('contact_accounts')
      .select('account_id')
      .eq('contact_id', survivorId)
      .eq('tenant_id', dataSourceTenantId)

    const survivorAccountIds = new Set(survivorAccounts?.map(a => a.account_id) || [])

    // Transfer unique account relationships from victim to survivor
    let accountsTransferred = 0
    if (victimAccounts) {
      for (const rel of victimAccounts) {
        if (!survivorAccountIds.has(rel.account_id)) {
          // This is a unique relationship, transfer it
          const { error: transferError } = await supabase
            .from('contact_accounts')
            .update({ contact_id: survivorId })
            .eq('id', rel.id)

          if (!transferError) {
            accountsTransferred++
          }
        }
      }
    }
    transferredData.account_relationships = accountsTransferred

    // Delete remaining victim account relationships (duplicates)
    await supabase
      .from('contact_accounts')
      .delete()
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)

    // 3i. Reassign communications
    const { data: commsData, error: commsError } = await supabase
      .from('communications')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (commsError) {
      log.error({ error: commsError }, 'Failed to reassign communications')
    } else {
      transferredData.communications = commsData?.length || 0
    }

    // 3j. Reassign leads (converted_contact_id)
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .update({ converted_contact_id: survivorId })
      .eq('converted_contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (leadsError) {
      log.error({ error: leadsError }, 'Failed to reassign leads')
    } else {
      transferredData.leads = leadsData?.length || 0
    }

    // 3k. Reassign contracts
    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (contractsError) {
      log.error({ error: contractsError }, 'Failed to reassign contracts')
    } else {
      transferredData.contracts = contractsData?.length || 0
    }

    // 3l. Reassign quotes
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotes')
      .update({ contact_id: survivorId })
      .eq('contact_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (quotesError) {
      log.error({ error: quotesError }, 'Failed to reassign quotes')
    } else {
      transferredData.quotes = quotesData?.length || 0
    }

    // 4. Create merge history record
    const { error: historyError } = await supabase
      .from('merge_history')
      .insert({
        tenant_id: dataSourceTenantId,
        entity_type: 'contact',
        survivor_id: survivorId,
        victim_id: victimId,
        survivor_snapshot: survivor,
        victim_snapshot: victim,
        merged_snapshot: mergedData,
        transferred_data: transferredData,
        merged_by: session.user.id,
        notes: notes || null
      })

    if (historyError) {
      log.error({ error: historyError }, 'Failed to create merge history')
      // Don't fail the merge, just log the error
    }

    // 5. Delete the victim contact
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', victimId)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      log.error({ error: deleteError }, 'Failed to delete victim contact')
      return NextResponse.json(
        { error: 'Failed to delete merged contact', details: deleteError.message },
        { status: 500 }
      )
    }

    // 6. Revalidate relevant paths
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/contacts`)
    revalidatePath(`/${tenantSubdomain}/contacts/${survivorId}`)

    log.info({ survivorId, victimId, transferredData }, 'Contact merge completed successfully')

    return NextResponse.json({
      success: true,
      survivorId,
      victimId,
      transferredData,
      message: 'Contacts merged successfully'
    })

  } catch (error) {
    log.error({ error }, 'Error merging contacts')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
