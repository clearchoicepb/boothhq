#!/usr/bin/env node

/**
 * Tenant Data Migration Script
 *
 * This script migrates existing data from the APPLICATION database
 * to the TENANT DATA database.
 *
 * Usage: node scripts/migrate-tenant-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

// Create clients
const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY
);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function migrateTable(tableName, data) {
  log(`\nMigrating ${tableName}... (${data.length} records)`, 'blue');

  if (data.length === 0) {
    log(`  ↳ No records to migrate`, 'yellow');
    return { success: true, count: 0 };
  }

  try {
    const { data: result, error } = await tenantDb
      .from(tableName)
      .upsert(data, { onConflict: 'id' });

    if (error) {
      log(`  ✗ Error migrating ${tableName}: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }

    log(`  ✓ Successfully migrated ${data.length} records`, 'green');
    return { success: true, count: data.length };
  } catch (error) {
    log(`  ✗ Exception migrating ${tableName}: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  console.clear();
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('🔄 Tenant Data Migration', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');
  log(`Tenant ID: ${TENANT_ID}`, 'blue');
  log(`Application DB: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`, 'blue');
  log(`Tenant Data DB: ${process.env.DEFAULT_TENANT_DATA_URL}`, 'blue');
  console.log('');

  const results = {
    success: [],
    failed: [],
    totalRecords: 0
  };

  // Step 1: Migrate Accounts (no dependencies)
  log('📊 Step 1: Migrating Accounts...', 'cyan');
  const { data: accounts, error: accountsError } = await appDb
    .from('accounts')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (accountsError) {
    log(`✗ Failed to fetch accounts: ${accountsError.message}`, 'red');
    process.exit(1);
  }

  const accountsResult = await migrateTable('accounts', accounts);
  if (accountsResult.success) {
    results.success.push({ table: 'accounts', count: accountsResult.count });
    results.totalRecords += accountsResult.count;
  } else {
    results.failed.push({ table: 'accounts', error: accountsResult.error });
  }

  // Step 2: Migrate Contacts (depends on accounts)
  log('📊 Step 2: Migrating Contacts...', 'cyan');
  const { data: contacts, error: contactsError } = await appDb
    .from('contacts')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (contactsError) {
    log(`✗ Failed to fetch contacts: ${contactsError.message}`, 'red');
  } else {
    const contactsResult = await migrateTable('contacts', contacts);
    if (contactsResult.success) {
      results.success.push({ table: 'contacts', count: contactsResult.count });
      results.totalRecords += contactsResult.count;
    } else {
      results.failed.push({ table: 'contacts', error: contactsResult.error });
    }
  }

  // Step 3: Migrate Contact-Account Junction
  log('📊 Step 3: Migrating Contact-Account Relationships...', 'cyan');
  const { data: contactAccounts, error: contactAccountsError } = await appDb
    .from('contact_accounts')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (!contactAccountsError && contactAccounts) {
    const contactAccountsResult = await migrateTable('contact_accounts', contactAccounts);
    if (contactAccountsResult.success) {
      results.success.push({ table: 'contact_accounts', count: contactAccountsResult.count });
      results.totalRecords += contactAccountsResult.count;
    } else {
      results.failed.push({ table: 'contact_accounts', error: contactAccountsResult.error });
    }
  }

  // Step 4: Migrate Leads
  log('📊 Step 4: Migrating Leads...', 'cyan');
  const { data: leads, error: leadsError } = await appDb
    .from('leads')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (!leadsError && leads) {
    const leadsResult = await migrateTable('leads', leads);
    if (leadsResult.success) {
      results.success.push({ table: 'leads', count: leadsResult.count });
      results.totalRecords += leadsResult.count;
    } else {
      results.failed.push({ table: 'leads', error: leadsResult.error });
    }
  }

  // Step 5: Migrate Opportunities (depends on accounts, contacts)
  log('📊 Step 5: Migrating Opportunities...', 'cyan');
  const { data: opportunities, error: opportunitiesError } = await appDb
    .from('opportunities')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (opportunitiesError) {
    log(`✗ Failed to fetch opportunities: ${opportunitiesError.message}`, 'red');
  } else {
    const opportunitiesResult = await migrateTable('opportunities', opportunities);
    if (opportunitiesResult.success) {
      results.success.push({ table: 'opportunities', count: opportunitiesResult.count });
      results.totalRecords += opportunitiesResult.count;
    } else {
      results.failed.push({ table: 'opportunities', error: opportunitiesResult.error });
    }
  }

  // Step 6: Migrate Opportunity Line Items
  log('📊 Step 6: Migrating Opportunity Line Items...', 'cyan');
  const { data: oppLineItems, error: oppLineItemsError } = await appDb
    .from('opportunity_line_items')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (!oppLineItemsError && oppLineItems) {
    const oppLineItemsResult = await migrateTable('opportunity_line_items', oppLineItems);
    if (oppLineItemsResult.success) {
      results.success.push({ table: 'opportunity_line_items', count: oppLineItemsResult.count });
      results.totalRecords += oppLineItemsResult.count;
    } else {
      results.failed.push({ table: 'opportunity_line_items', error: oppLineItemsResult.error });
    }
  }

  // Step 7: Migrate Locations
  log('📊 Step 7: Migrating Locations...', 'cyan');
  const { data: locations, error: locationsError } = await appDb
    .from('locations')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (!locationsError && locations) {
    const locationsResult = await migrateTable('locations', locations);
    if (locationsResult.success) {
      results.success.push({ table: 'locations', count: locationsResult.count });
      results.totalRecords += locationsResult.count;
    } else {
      results.failed.push({ table: 'locations', error: locationsResult.error });
    }
  }

  // Step 8: Migrate Events (depends on accounts, contacts, opportunities, locations)
  log('📊 Step 8: Migrating Events...', 'cyan');
  const { data: events, error: eventsError } = await appDb
    .from('events')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (eventsError) {
    log(`✗ Failed to fetch events: ${eventsError.message}`, 'red');
  } else {
    const eventsResult = await migrateTable('events', events);
    if (eventsResult.success) {
      results.success.push({ table: 'events', count: eventsResult.count });
      results.totalRecords += eventsResult.count;
    } else {
      results.failed.push({ table: 'events', error: eventsResult.error });
    }
  }

  // Step 9: Migrate Event Dates
  log('📊 Step 9: Migrating Event Dates...', 'cyan');
  const { data: eventDates, error: eventDatesError } = await appDb
    .from('event_dates')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (!eventDatesError && eventDates) {
    const eventDatesResult = await migrateTable('event_dates', eventDates);
    if (eventDatesResult.success) {
      results.success.push({ table: 'event_dates', count: eventDatesResult.count });
      results.totalRecords += eventDatesResult.count;
    } else {
      results.failed.push({ table: 'event_dates', error: eventDatesResult.error });
    }
  }

  // Step 10: Migrate Related Tables (tasks, notes, attachments)
  const relatedTables = ['tasks', 'notes', 'attachments', 'communications'];

  for (const tableName of relatedTables) {
    log(`📊 Migrating ${tableName}...`, 'cyan');
    const { data, error } = await appDb
      .from(tableName)
      .select('*')
      .eq('tenant_id', TENANT_ID);

    if (!error && data) {
      const result = await migrateTable(tableName, data);
      if (result.success) {
        results.success.push({ table: tableName, count: result.count });
        results.totalRecords += result.count;
      } else {
        results.failed.push({ table: tableName, error: result.error });
      }
    }
  }

  // Summary
  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('📊 Migration Summary', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  console.log('');

  log(`Total Records Migrated: ${results.totalRecords}`, 'green');
  log(`Tables Processed: ${results.success.length + results.failed.length}`, 'blue');
  log(`Successful: ${results.success.length}`, 'green');
  log(`Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');
  console.log('');

  if (results.success.length > 0) {
    log('✓ Successfully migrated:', 'green');
    results.success.forEach(({ table, count }) => {
      log(`  • ${table}: ${count} records`, 'green');
    });
    console.log('');
  }

  if (results.failed.length > 0) {
    log('✗ Failed to migrate:', 'red');
    results.failed.forEach(({ table, error }) => {
      log(`  • ${table}: ${error}`, 'red');
    });
    console.log('');
  }

  if (results.failed.length === 0) {
    log('🎉 Migration completed successfully!', 'green');
    console.log('');
    log('Next steps:', 'blue');
    console.log('  1. Verify the migrated data in the tenant database');
    console.log('  2. Update the tenant record to point to the new database');
    console.log('  3. Test the application');
    console.log('');
  } else {
    log('⚠️  Migration completed with errors.', 'yellow');
    console.log('');
    log('Please review the failed tables above and try again.', 'yellow');
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('');
  log('❌ Migration script failed:', 'red');
  console.error(error);
  console.error('');
  process.exit(1);
});
