#!/usr/bin/env tsx

/**
 * Script to properly encrypt and store tenant database keys
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

function encryptKey(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted (all in base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

async function main() {
  console.log('\n🔐 Encrypting Tenant Database Keys...\n');

  // Connect to application database
  const appDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get the tenant
  const { data: tenant, error: fetchError } = await appDb
    .from('tenants')
    .select('id, name, subdomain')
    .eq('subdomain', 'default')
    .single();

  if (fetchError || !tenant) {
    console.error('❌ Failed to fetch tenant:', fetchError?.message);
    process.exit(1);
  }

  console.log(`Found tenant: ${tenant.name} (${tenant.subdomain})`);
  console.log(`Tenant ID: ${tenant.id}\n`);

  // Encrypt the keys
  const encryptedAnonKey = encryptKey(process.env.DEFAULT_TENANT_DATA_ANON_KEY!);
  const encryptedServiceKey = encryptKey(process.env.DEFAULT_TENANT_DATA_SERVICE_KEY!);

  console.log('✓ Keys encrypted successfully\n');
  console.log(`Anon Key Format: ${encryptedAnonKey.substring(0, 50)}...`);
  console.log(`Service Key Format: ${encryptedServiceKey.substring(0, 50)}...\n`);

  // Update the tenant record
  const { error: updateError } = await appDb
    .from('tenants')
    .update({
      data_source_url: process.env.DEFAULT_TENANT_DATA_URL,
      data_source_anon_key: encryptedAnonKey,
      data_source_service_key: encryptedServiceKey,
      data_source_region: 'us-east-1', // Update if different
      tenant_id_in_data_source: tenant.id // Use same tenant ID
    })
    .eq('id', tenant.id);

  if (updateError) {
    console.error('❌ Failed to update tenant:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Tenant record updated successfully!\n');
  console.log('📋 Updated fields:');
  console.log('  - data_source_url');
  console.log('  - data_source_anon_key (encrypted)');
  console.log('  - data_source_service_key (encrypted)');
  console.log('  - data_source_region');
  console.log('  - tenant_id_in_data_source\n');
  
  console.log('🎉 Done! The DataSourceManager should now work correctly.\n');
}

main().catch(console.error);

