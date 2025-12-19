/**
 * Contact Data Analysis - Diagnostic Endpoint
 *
 * Analyzes the database to identify legacy vs standard contact/account records
 * and quantify inconsistencies for migration planning.
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:debug')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      tenantId: dataSourceTenantId,
      counts: {},
      details: {},
      summary: {}
    }

    // =========================================================================
    // 1. Total Counts
    // =========================================================================

    // Total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)

    results.counts.totalContacts = totalContacts || 0

    // Total accounts
    const { count: totalAccounts } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)

    results.counts.totalAccounts = totalAccounts || 0

    // Total contact_accounts junction entries
    const { count: totalJunctionEntries } = await supabase
      .from('contact_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)

    results.counts.totalJunctionEntries = totalJunctionEntries || 0

    // Total events
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)

    results.counts.totalEvents = totalEvents || 0

    // =========================================================================
    // 2. Contacts with account_id but NO contact_accounts entry (LEGACY GAP)
    // =========================================================================

    // Get all contacts with account_id
    const { data: contactsWithAccountId } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, account_id, created_at')
      .eq('tenant_id', dataSourceTenantId)
      .not('account_id', 'is', null)

    // Get all contact_accounts entries
    const { data: junctionEntries } = await supabase
      .from('contact_accounts')
      .select('contact_id, account_id')
      .eq('tenant_id', dataSourceTenantId)

    // Find contacts with account_id but no matching junction entry
    const junctionSet = new Set(
      (junctionEntries || []).map(j => `${j.contact_id}-${j.account_id}`)
    )

    const contactsWithoutJunction = (contactsWithAccountId || []).filter(
      c => !junctionSet.has(`${c.id}-${c.account_id}`)
    )

    results.counts.contactsWithAccountId = contactsWithAccountId?.length || 0
    results.counts.contactsWithAccountIdButNoJunction = contactsWithoutJunction.length
    results.details.contactsWithAccountIdButNoJunction = contactsWithoutJunction.slice(0, 20) // First 20

    // =========================================================================
    // 3. Contacts WITHOUT account_id but WITH contact_accounts entries
    // =========================================================================

    const { data: contactsWithoutAccountId } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, created_at')
      .eq('tenant_id', dataSourceTenantId)
      .is('account_id', null)

    const contactIdsWithJunction = new Set(
      (junctionEntries || []).map(j => j.contact_id)
    )

    const contactsWithJunctionButNoAccountId = (contactsWithoutAccountId || []).filter(
      c => contactIdsWithJunction.has(c.id)
    )

    results.counts.contactsWithoutAccountId = contactsWithoutAccountId?.length || 0
    results.counts.contactsWithJunctionButNoAccountId = contactsWithJunctionButNoAccountId.length
    results.details.contactsWithJunctionButNoAccountId = contactsWithJunctionButNoAccountId.slice(0, 20)

    // =========================================================================
    // 4. Events with contact_id but NULL primary_contact_id (LEGACY EVENTS)
    // =========================================================================

    const { data: eventsWithContactIdOnly } = await supabase
      .from('events')
      .select('id, title, contact_id, primary_contact_id, created_at')
      .eq('tenant_id', dataSourceTenantId)
      .not('contact_id', 'is', null)
      .is('primary_contact_id', null)

    results.counts.eventsWithContactIdButNoPrimaryContact = eventsWithContactIdOnly?.length || 0
    results.details.eventsWithContactIdButNoPrimaryContact = eventsWithContactIdOnly?.slice(0, 20)

    // =========================================================================
    // 5. Events with primary_contact_id but NULL contact_id (NEW EVENTS)
    // =========================================================================

    const { data: eventsWithPrimaryContactOnly } = await supabase
      .from('events')
      .select('id, title, contact_id, primary_contact_id, created_at')
      .eq('tenant_id', dataSourceTenantId)
      .is('contact_id', null)
      .not('primary_contact_id', 'is', null)

    results.counts.eventsWithPrimaryContactButNoContactId = eventsWithPrimaryContactOnly?.length || 0
    results.details.eventsWithPrimaryContactButNoContactId = eventsWithPrimaryContactOnly?.slice(0, 20)

    // =========================================================================
    // 6. Events with BOTH contact_id and primary_contact_id (check if they match)
    // =========================================================================

    const { data: eventsWithBothContacts } = await supabase
      .from('events')
      .select('id, title, contact_id, primary_contact_id, created_at')
      .eq('tenant_id', dataSourceTenantId)
      .not('contact_id', 'is', null)
      .not('primary_contact_id', 'is', null)

    const eventsMismatched = (eventsWithBothContacts || []).filter(
      e => e.contact_id !== e.primary_contact_id
    )

    results.counts.eventsWithBothContactFields = eventsWithBothContacts?.length || 0
    results.counts.eventsWithMismatchedContactFields = eventsMismatched.length
    results.details.eventsWithMismatchedContactFields = eventsMismatched.slice(0, 20)

    // =========================================================================
    // 7. Events with NO contact at all
    // =========================================================================

    const { count: eventsWithNoContact } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .is('contact_id', null)
      .is('primary_contact_id', null)

    results.counts.eventsWithNoContact = eventsWithNoContact || 0

    // =========================================================================
    // 8. Accounts address format analysis (JSONB vs separate columns)
    // =========================================================================

    const { data: accountsWithAddresses } = await supabase
      .from('accounts')
      .select('id, name, billing_address, billing_address_line_1, shipping_address, shipping_address_line_1')
      .eq('tenant_id', dataSourceTenantId)
      .limit(100)

    let accountsWithJsonbOnly = 0
    let accountsWithColumnsOnly = 0
    let accountsWithBothFormats = 0
    let accountsWithNoAddress = 0

    for (const account of accountsWithAddresses || []) {
      const hasJsonb = account.billing_address || account.shipping_address
      const hasColumns = account.billing_address_line_1 || account.shipping_address_line_1

      if (hasJsonb && hasColumns) accountsWithBothFormats++
      else if (hasJsonb && !hasColumns) accountsWithJsonbOnly++
      else if (!hasJsonb && hasColumns) accountsWithColumnsOnly++
      else accountsWithNoAddress++
    }

    results.counts.accountsAddressFormat = {
      jsonbOnly: accountsWithJsonbOnly,
      columnsOnly: accountsWithColumnsOnly,
      bothFormats: accountsWithBothFormats,
      noAddress: accountsWithNoAddress,
      sampleSize: accountsWithAddresses?.length || 0
    }

    // =========================================================================
    // 9. Contacts address format analysis (JSONB vs separate columns)
    // =========================================================================

    const { data: contactsWithAddresses } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, address, address_line_1, city')
      .eq('tenant_id', dataSourceTenantId)
      .limit(100)

    let contactsWithJsonbAddress = 0
    let contactsWithColumnAddress = 0
    let contactsWithBothAddressFormats = 0
    let contactsWithNoAddress = 0

    for (const contact of contactsWithAddresses || []) {
      const hasJsonb = contact.address && typeof contact.address === 'object'
      const hasColumns = contact.address_line_1 || contact.city

      if (hasJsonb && hasColumns) contactsWithBothAddressFormats++
      else if (hasJsonb && !hasColumns) contactsWithJsonbAddress++
      else if (!hasJsonb && hasColumns) contactsWithColumnAddress++
      else contactsWithNoAddress++
    }

    results.counts.contactsAddressFormat = {
      jsonbOnly: contactsWithJsonbAddress,
      columnsOnly: contactsWithColumnAddress,
      bothFormats: contactsWithBothAddressFormats,
      noAddress: contactsWithNoAddress,
      sampleSize: contactsWithAddresses?.length || 0
    }

    // =========================================================================
    // 10. Contact_accounts with ended relationships
    // =========================================================================

    const { count: endedRelationships } = await supabase
      .from('contact_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .not('end_date', 'is', null)

    const { count: activeRelationships } = await supabase
      .from('contact_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataSourceTenantId)
      .is('end_date', null)

    results.counts.junctionActiveRelationships = activeRelationships || 0
    results.counts.junctionEndedRelationships = endedRelationships || 0

    // =========================================================================
    // 11. Contacts with multiple active account relationships
    // =========================================================================

    const { data: multiAccountContacts } = await supabase
      .from('contact_accounts')
      .select('contact_id')
      .eq('tenant_id', dataSourceTenantId)
      .is('end_date', null)

    const contactAccountCounts: Record<string, number> = {}
    for (const entry of multiAccountContacts || []) {
      contactAccountCounts[entry.contact_id] = (contactAccountCounts[entry.contact_id] || 0) + 1
    }

    const contactsWithMultipleAccounts = Object.values(contactAccountCounts).filter(count => count > 1).length

    results.counts.contactsWithMultipleActiveAccounts = contactsWithMultipleAccounts

    // =========================================================================
    // SUMMARY
    // =========================================================================

    results.summary = {
      legacyIssues: {
        contactsMissingJunctionEntry: contactsWithoutJunction.length,
        eventsMissingPrimaryContactId: eventsWithContactIdOnly?.length || 0,
        accountsWithJsonbAddressOnly: accountsWithJsonbOnly,
        contactsWithJsonbAddressOnly: contactsWithJsonbAddress
      },
      dataSyncIssues: {
        eventContactFieldMismatches: eventsMismatched.length,
        contactsWithJunctionButNoAccountId: contactsWithJunctionButNoAccountId.length
      },
      healthyRecords: {
        contactsWithBothAccountIdAndJunction: (contactsWithAccountId?.length || 0) - contactsWithoutJunction.length,
        eventsWithSyncedContactFields: eventsWithBothContacts?.length || 0,
        activeContactAccountRelationships: activeRelationships || 0
      },
      totalRecordsToMigrate:
        contactsWithoutJunction.length +
        (eventsWithContactIdOnly?.length || 0) +
        contactsWithJunctionButNoAccountId.length
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    log.error({ error }, 'Contact data analysis error')
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
