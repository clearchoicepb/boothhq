import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:accounts:merge')

interface MergeAccountsRequest {
  survivorId: string        // The account that will remain
  victimId: string          // The account that will be deleted
  mergedData: Record<string, unknown>  // The field values to use for the survivor
  notes?: string            // Optional notes about why this merge was done
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body: MergeAccountsRequest = await request.json()
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
        { error: 'Cannot merge an account with itself' },
        { status: 400 }
      )
    }

    log.info({ survivorId, victimId }, 'Starting account merge')

    // 1. Fetch both accounts to verify they exist and belong to this tenant
    const [survivorResult, victimResult] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('id', survivorId)
        .eq('tenant_id', dataSourceTenantId)
        .single(),
      supabase
        .from('accounts')
        .select('*')
        .eq('id', victimId)
        .eq('tenant_id', dataSourceTenantId)
        .single()
    ])

    if (survivorResult.error || !survivorResult.data) {
      log.error({ error: survivorResult.error, survivorId }, 'Survivor account not found')
      return NextResponse.json(
        { error: 'Survivor account not found' },
        { status: 404 }
      )
    }

    if (victimResult.error || !victimResult.data) {
      log.error({ error: victimResult.error, victimId }, 'Victim account not found')
      return NextResponse.json(
        { error: 'Victim account not found' },
        { status: 404 }
      )
    }

    const survivor = survivorResult.data
    const victim = victimResult.data

    // Track transferred data counts
    const transferredData: Record<string, number> = {}

    // 2. Update survivor with merged data
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        ...mergedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', survivorId)
      .eq('tenant_id', dataSourceTenantId)

    if (updateError) {
      log.error({ error: updateError }, 'Failed to update survivor account')
      return NextResponse.json(
        { error: 'Failed to update survivor account', details: updateError.message },
        { status: 500 }
      )
    }

    // 3. Reassign all related data from victim to survivor

    // 3a. Update contacts' legacy account_id field
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (contactsError) {
      log.error({ error: contactsError }, 'Failed to reassign contacts')
    } else {
      transferredData.contacts = contactsData?.length || 0
    }

    // 3b. Merge contact_accounts (junction table)
    // Get victim's contact relationships
    const { data: victimContactAccounts } = await supabase
      .from('contact_accounts')
      .select('*')
      .eq('account_id', victimId)
      .eq('tenant_id', dataSourceTenantId)

    // Get survivor's existing contacts
    const { data: survivorContactAccounts } = await supabase
      .from('contact_accounts')
      .select('contact_id')
      .eq('account_id', survivorId)
      .eq('tenant_id', dataSourceTenantId)

    const survivorContactIds = new Set(survivorContactAccounts?.map(c => c.contact_id) || [])

    // Transfer unique contact relationships from victim to survivor
    let contactRelationshipsTransferred = 0
    if (victimContactAccounts) {
      for (const rel of victimContactAccounts) {
        if (!survivorContactIds.has(rel.contact_id)) {
          // This is a unique relationship, transfer it
          const { error: transferError } = await supabase
            .from('contact_accounts')
            .update({ account_id: survivorId })
            .eq('id', rel.id)

          if (!transferError) {
            contactRelationshipsTransferred++
          }
        }
      }
    }
    transferredData.contact_relationships = contactRelationshipsTransferred

    // Delete remaining victim contact relationships (duplicates)
    await supabase
      .from('contact_accounts')
      .delete()
      .eq('account_id', victimId)
      .eq('tenant_id', dataSourceTenantId)

    // 3c. Reassign events
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (eventsError) {
      log.error({ error: eventsError }, 'Failed to reassign events')
    } else {
      transferredData.events = eventsData?.length || 0
    }

    // 3d. Reassign opportunities
    const { data: oppsData, error: oppsError } = await supabase
      .from('opportunities')
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
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
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
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
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
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
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (notesError) {
      log.error({ error: notesError }, 'Failed to reassign notes')
    } else {
      transferredData.notes = notesData?.length || 0
    }

    // 3h. Reassign communications
    const { data: commsData, error: commsError } = await supabase
      .from('communications')
      .update({ account_id: survivorId })
      .eq('account_id', victimId)
      .eq('tenant_id', dataSourceTenantId)
      .select('id')

    if (commsError) {
      log.error({ error: commsError }, 'Failed to reassign communications')
    } else {
      transferredData.communications = commsData?.length || 0
    }

    // 4. Create merge history record
    const { error: historyError } = await supabase
      .from('merge_history')
      .insert({
        tenant_id: dataSourceTenantId,
        entity_type: 'account',
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

    // 5. Delete the victim account
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', victimId)
      .eq('tenant_id', dataSourceTenantId)

    if (deleteError) {
      log.error({ error: deleteError }, 'Failed to delete victim account')
      return NextResponse.json(
        { error: 'Failed to delete merged account', details: deleteError.message },
        { status: 500 }
      )
    }

    // 6. Revalidate relevant paths
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/accounts`)
    revalidatePath(`/${tenantSubdomain}/accounts/${survivorId}`)

    log.info({ survivorId, victimId, transferredData }, 'Account merge completed successfully')

    return NextResponse.json({
      success: true,
      survivorId,
      victimId,
      transferredData,
      message: 'Accounts merged successfully'
    })

  } catch (error) {
    log.error({ error }, 'Error merging accounts')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
