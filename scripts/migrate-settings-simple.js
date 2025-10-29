#!/usr/bin/env node

/**
 * Simple tenant_settings migration
 * Migrates data from App DB to Tenant DB
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18';

const appDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const tenantDb = createClient(
  process.env.DEFAULT_TENANT_DATA_URL,
  process.env.DEFAULT_TENANT_DATA_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

async function main() {
  console.log('\n🔄 Starting migration...\n');

  // Step 1: Get settings from App DB
  console.log('📖 Reading from Application DB...');
  const { data: appSettings, error: appError } = await appDb
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', TENANT_ID);

  if (appError) {
    console.error('❌ Error reading from App DB:', appError);
    process.exit(1);
  }

  console.log(`✅ Found ${appSettings.length} settings in Application DB\n`);

  if (appSettings.length === 0) {
    console.log('⚠️  No settings to migrate');
    return;
  }

  // Step 2: Check if data already exists in Tenant DB
  console.log('🔍 Checking Tenant DB...');
  const { count: existingCount, error: countError } = await tenantDb
    .from('tenant_settings')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);

  if (countError) {
    console.error('⚠️  Error checking Tenant DB:', countError.message);
    console.log('   This might be expected if the table is new.');
  } else if (existingCount > 0) {
    console.log(`⚠️  Found ${existingCount} existing settings in Tenant DB`);
    console.log('   Proceeding with upsert to avoid duplicates...\n');
  }

  // Step 3: Migrate data using upsert
  console.log(`📝 Migrating ${appSettings.length} settings...`);
  
  const settingsToInsert = appSettings.map(s => ({
    id: s.id,
    tenant_id: s.tenant_id,
    setting_key: s.setting_key,
    setting_value: s.setting_value,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  // Insert in batches to avoid timeout
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < settingsToInsert.length; i += batchSize) {
    const batch = settingsToInsert.slice(i, i + batchSize);
    
    const { data, error } = await tenantDb
      .from('tenant_settings')
      .upsert(batch, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error(`❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      console.error('   Code:', error.code);
      console.error('   Hint:', error.hint);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      process.stdout.write(`   Progress: ${successCount}/${settingsToInsert.length}\r`);
    }
  }

  console.log(`\n\n✅ Migration complete: ${successCount} successful, ${errorCount} errors\n`);

  // Step 4: Verify opportunity stages
  console.log('🔍 Verifying opportunity stages...');
  const { data: stages, error: stagesError } = await tenantDb
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', TENANT_ID)
    .like('setting_key', 'opportunities.stages%');

  if (stagesError) {
    console.error('⚠️  Error verifying stages:', stagesError.message);
  } else {
    console.log(`✅ Found ${stages.length} opportunity stage settings`);
    
    const stagesArray = stages.find(s => s.setting_key === 'opportunities.stages');
    if (stagesArray && Array.isArray(stagesArray.setting_value)) {
      console.log(`\n📊 Opportunity stages:`);
      stagesArray.setting_value.forEach((stage, i) => {
        console.log(`   ${i + 1}. ${stage.name} (${stage.id})`);
      });

      const hasCustomStage = stagesArray.setting_value.some(s => s.id === 'stage_1761253720446');
      if (hasCustomStage) {
        console.log(`\n✅ Custom stage stage_1761253720446 found!`);
      }
    }
  }

  console.log('\n✨ Done!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});

