/**
 * Contact Data Legacy Analysis Script
 *
 * Analyzes the database to identify legacy vs standard contact/account records
 * and quantify inconsistencies for migration planning.
 *
 * Run with: npx ts-node scripts/analyze-contact-data-legacy.ts [tenant-id]
 */

import { createServerSupabaseClient } from '../src/lib/supabase-client';
import { getTenantClient, getTenantIdInDataSource } from '../src/lib/data-sources';

interface AnalysisResults {
  timestamp: string;
  tenantId: string;
  counts: Record<string, any>;
  details: Record<string, any[]>;
  summary: Record<string, any>;
}

async function analyzeContactData(tenantId?: string) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║      CONTACT DATA LEGACY ANALYSIS                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const appDb = createServerSupabaseClient();

  // If no tenant ID provided, list all tenants
  if (!tenantId) {
    const { data: tenants, error } = await appDb
      .from('tenants')
      .select('id, name')
      .limit(10);

    if (error) {
      console.error('Error fetching tenants:', error);
      return;
    }

    if (!tenants || tenants.length === 0) {
      console.log('❌ No tenants found!');
      return;
    }

    console.log('Available tenants:');
    tenants.forEach((t: any) => console.log(`  - ${t.id} (${t.name})`));
    console.log('\nUsage: npx ts-node scripts/analyze-contact-data-legacy.ts <tenant-id>');
    return;
  }

  console.log(`Analyzing tenant: ${tenantId}\n`);

  try {
    // Get mapped tenant ID and connect
    const mappedTenantId = await getTenantIdInDataSource(tenantId);
    const supabase = await getTenantClient(tenantId, true);

    console.log(`Connected to tenant database (mapped ID: ${mappedTenantId})\n`);

    const results: AnalysisResults = {
      timestamp: new Date().toISOString(),
      tenantId: mappedTenantId,
      counts: {},
      details: {},
      summary: {}
    };

    // =========================================================================
    // 1. TOTAL COUNTS
    // =========================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SECTION 1: TOTAL COUNTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId);
    results.counts.totalContacts = totalContacts || 0;
    console.log(`Total Contacts:              ${totalContacts || 0}`);

    // Total accounts
    const { count: totalAccounts } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId);
    results.counts.totalAccounts = totalAccounts || 0;
    console.log(`Total Accounts:              ${totalAccounts || 0}`);

    // Total contact_accounts junction entries
    const { count: totalJunctionEntries } = await supabase
      .from('contact_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId);
    results.counts.totalJunctionEntries = totalJunctionEntries || 0;
    console.log(`Total Junction Entries:      ${totalJunctionEntries || 0}`);

    // Total events
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId);
    results.counts.totalEvents = totalEvents || 0;
    console.log(`Total Events:                ${totalEvents || 0}`);

    // =========================================================================
    // 2. CONTACTS WITH account_id BUT NO contact_accounts ENTRY
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 2: LEGACY CONTACTS (account_id but no junction entry)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all contacts with account_id
    const { data: contactsWithAccountId } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, account_id, created_at')
      .eq('tenant_id', mappedTenantId)
      .not('account_id', 'is', null);

    // Get all contact_accounts entries
    const { data: junctionEntries } = await supabase
      .from('contact_accounts')
      .select('contact_id, account_id')
      .eq('tenant_id', mappedTenantId);

    // Find contacts with account_id but no matching junction entry
    const junctionSet = new Set(
      (junctionEntries || []).map((j: any) => `${j.contact_id}-${j.account_id}`)
    );

    const contactsWithoutJunction = (contactsWithAccountId || []).filter(
      (c: any) => !junctionSet.has(`${c.id}-${c.account_id}`)
    );

    results.counts.contactsWithAccountId = contactsWithAccountId?.length || 0;
    results.counts.contactsWithAccountIdButNoJunction = contactsWithoutJunction.length;
    results.details.contactsWithAccountIdButNoJunction = contactsWithoutJunction;

    console.log(`Contacts with account_id:                    ${contactsWithAccountId?.length || 0}`);
    console.log(`❌ Contacts missing junction entry:          ${contactsWithoutJunction.length}`);

    if (contactsWithoutJunction.length > 0) {
      console.log('\n   Sample legacy contacts (first 10):');
      contactsWithoutJunction.slice(0, 10).forEach((c: any) => {
        console.log(`   - ${c.first_name} ${c.last_name} (${c.email || 'no email'}) - created: ${c.created_at?.split('T')[0]}`);
      });
    }

    // =========================================================================
    // 3. CONTACTS WITHOUT account_id BUT WITH contact_accounts ENTRIES
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 3: ORPHANED JUNCTION ENTRIES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: contactsWithoutAccountId } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, created_at')
      .eq('tenant_id', mappedTenantId)
      .is('account_id', null);

    const contactIdsWithJunction = new Set(
      (junctionEntries || []).map((j: any) => j.contact_id)
    );

    const contactsWithJunctionButNoAccountId = (contactsWithoutAccountId || []).filter(
      (c: any) => contactIdsWithJunction.has(c.id)
    );

    results.counts.contactsWithoutAccountId = contactsWithoutAccountId?.length || 0;
    results.counts.contactsWithJunctionButNoAccountId = contactsWithJunctionButNoAccountId.length;
    results.details.contactsWithJunctionButNoAccountId = contactsWithJunctionButNoAccountId;

    console.log(`Contacts without account_id:                 ${contactsWithoutAccountId?.length || 0}`);
    console.log(`⚠️  Contacts with junction but no account_id: ${contactsWithJunctionButNoAccountId.length}`);

    // =========================================================================
    // 4. EVENTS WITH contact_id BUT NULL primary_contact_id
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 4: LEGACY EVENTS (contact_id but no primary_contact_id)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: eventsWithContactIdOnly } = await supabase
      .from('events')
      .select('id, title, contact_id, primary_contact_id, created_at')
      .eq('tenant_id', mappedTenantId)
      .not('contact_id', 'is', null)
      .is('primary_contact_id', null);

    results.counts.eventsWithContactIdButNoPrimaryContact = eventsWithContactIdOnly?.length || 0;
    results.details.eventsWithContactIdButNoPrimaryContact = eventsWithContactIdOnly || [];

    console.log(`❌ Events with only contact_id (legacy):     ${eventsWithContactIdOnly?.length || 0}`);

    if ((eventsWithContactIdOnly?.length || 0) > 0) {
      console.log('\n   Sample legacy events (first 10):');
      eventsWithContactIdOnly?.slice(0, 10).forEach((e: any) => {
        console.log(`   - "${e.title}" - created: ${e.created_at?.split('T')[0]}`);
      });
    }

    // =========================================================================
    // 5. EVENTS WITH primary_contact_id BUT NULL contact_id
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 5: NEW-STYLE EVENTS (primary_contact_id but no contact_id)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: eventsWithPrimaryContactOnly } = await supabase
      .from('events')
      .select('id, title, contact_id, primary_contact_id, created_at')
      .eq('tenant_id', mappedTenantId)
      .is('contact_id', null)
      .not('primary_contact_id', 'is', null);

    results.counts.eventsWithPrimaryContactButNoContactId = eventsWithPrimaryContactOnly?.length || 0;
    results.details.eventsWithPrimaryContactButNoContactId = eventsWithPrimaryContactOnly || [];

    console.log(`Events with only primary_contact_id (new):   ${eventsWithPrimaryContactOnly?.length || 0}`);

    // =========================================================================
    // 6. EVENTS WITH BOTH CONTACT FIELDS (CHECK MATCH)
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 6: EVENTS WITH BOTH CONTACT FIELDS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { data: eventsWithBothContacts } = await supabase
      .from('events')
      .select('id, title, contact_id, primary_contact_id, created_at')
      .eq('tenant_id', mappedTenantId)
      .not('contact_id', 'is', null)
      .not('primary_contact_id', 'is', null);

    const eventsMismatched = (eventsWithBothContacts || []).filter(
      (e: any) => e.contact_id !== e.primary_contact_id
    );

    results.counts.eventsWithBothContactFields = eventsWithBothContacts?.length || 0;
    results.counts.eventsWithMismatchedContactFields = eventsMismatched.length;
    results.details.eventsWithMismatchedContactFields = eventsMismatched;

    console.log(`Events with both contact fields:             ${eventsWithBothContacts?.length || 0}`);
    console.log(`⚠️  Events with MISMATCHED contacts:          ${eventsMismatched.length}`);

    if (eventsMismatched.length > 0) {
      console.log('\n   Events with mismatched contacts:');
      eventsMismatched.slice(0, 5).forEach((e: any) => {
        console.log(`   - "${e.title}": contact_id=${e.contact_id}, primary_contact_id=${e.primary_contact_id}`);
      });
    }

    // =========================================================================
    // 7. EVENTS WITH NO CONTACT
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 7: EVENTS WITH NO CONTACT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { count: eventsWithNoContact } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId)
      .is('contact_id', null)
      .is('primary_contact_id', null);

    results.counts.eventsWithNoContact = eventsWithNoContact || 0;
    console.log(`Events with no contact at all:               ${eventsWithNoContact || 0}`);

    // =========================================================================
    // 8. JUNCTION TABLE RELATIONSHIPS
    // =========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SECTION 8: JUNCTION TABLE HEALTH');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const { count: activeRelationships } = await supabase
      .from('contact_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId)
      .is('end_date', null);

    const { count: endedRelationships } = await supabase
      .from('contact_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', mappedTenantId)
      .not('end_date', 'is', null);

    results.counts.junctionActiveRelationships = activeRelationships || 0;
    results.counts.junctionEndedRelationships = endedRelationships || 0;

    console.log(`Active relationships:                        ${activeRelationships || 0}`);
    console.log(`Ended relationships:                         ${endedRelationships || 0}`);

    // Contacts with multiple accounts
    const { data: multiAccountContacts } = await supabase
      .from('contact_accounts')
      .select('contact_id')
      .eq('tenant_id', mappedTenantId)
      .is('end_date', null);

    const contactAccountCounts: Record<string, number> = {};
    for (const entry of multiAccountContacts || []) {
      contactAccountCounts[entry.contact_id] = (contactAccountCounts[entry.contact_id] || 0) + 1;
    }

    const contactsWithMultipleAccounts = Object.values(contactAccountCounts).filter(count => count > 1).length;
    results.counts.contactsWithMultipleActiveAccounts = contactsWithMultipleAccounts;

    console.log(`Contacts with multiple accounts:             ${contactsWithMultipleAccounts}`);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                        SUMMARY                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const legacyContactsCount = contactsWithoutJunction.length;
    const legacyEventsCount = eventsWithContactIdOnly?.length || 0;
    const totalRecordsNeedingMigration = legacyContactsCount + legacyEventsCount + contactsWithJunctionButNoAccountId.length;

    results.summary = {
      legacyIssues: {
        contactsMissingJunctionEntry: legacyContactsCount,
        eventsMissingPrimaryContactId: legacyEventsCount
      },
      dataSyncIssues: {
        eventContactFieldMismatches: eventsMismatched.length,
        contactsWithJunctionButNoAccountId: contactsWithJunctionButNoAccountId.length
      },
      healthyRecords: {
        contactsWithBothAccountIdAndJunction: (contactsWithAccountId?.length || 0) - legacyContactsCount,
        eventsWithSyncedContactFields: eventsWithBothContacts?.length || 0
      },
      totalRecordsToMigrate: totalRecordsNeedingMigration
    };

    console.log('LEGACY ISSUES (require migration):');
    console.log(`  ❌ Contacts missing junction entry:        ${legacyContactsCount}`);
    console.log(`  ❌ Events missing primary_contact_id:      ${legacyEventsCount}`);

    console.log('\nDATA SYNC ISSUES:');
    console.log(`  ⚠️  Event contact field mismatches:         ${eventsMismatched.length}`);
    console.log(`  ⚠️  Contacts with orphaned junction:        ${contactsWithJunctionButNoAccountId.length}`);

    console.log('\nHEALTHY RECORDS:');
    console.log(`  ✅ Contacts with both ID & junction:       ${(contactsWithAccountId?.length || 0) - legacyContactsCount}`);
    console.log(`  ✅ Events with synced contact fields:      ${eventsWithBothContacts?.length || 0}`);
    console.log(`  ✅ Active contact-account relationships:   ${activeRelationships || 0}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`TOTAL RECORDS NEEDING MIGRATION:             ${totalRecordsNeedingMigration}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (totalRecordsNeedingMigration > 0) {
      console.log('RECOMMENDED ACTIONS:');
      console.log('1. Create contact_accounts entries for contacts with account_id');
      console.log('2. Set primary_contact_id = contact_id for legacy events');
      console.log('3. Sync account_id for contacts that only have junction entries');
      console.log('4. Review mismatched event contact fields');
    } else {
      console.log('✅ No migration needed - all records appear to be in sync!');
    }

    return results;

  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

// Run the analysis
const tenantId = process.argv[2];
analyzeContactData(tenantId)
  .then((results) => {
    if (results) {
      console.log('\n\nAnalysis complete. JSON output:');
      console.log(JSON.stringify(results.summary, null, 2));
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });
