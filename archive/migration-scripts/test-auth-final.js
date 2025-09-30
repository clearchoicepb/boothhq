const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function testAuthentication() {
  console.log('Testing Authentication Flow...\n');
  console.log('='.repeat(60));
  
  const credentials = {
    email: 'admin@clearchoicephotos.com',
    password: 'Cl3@rCh01c3!2025$',
    tenant: 'default'
  };
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('Step 1: Looking up tenant...');
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', credentials.tenant)
    .eq('status', 'active')
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Tenant lookup failed:', tenantError);
    return;
  }
  console.log('✅ Tenant found:', tenant.name);

  console.log('\nStep 2: Looking up user...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', credentials.email)
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .single();

  if (userError || !user) {
    console.error('❌ User lookup failed:', userError);
    return;
  }
  console.log('✅ User found:', user.email);

  console.log('\nStep 3: Verifying password...');
  if (!user.password_hash) {
    console.error('❌ User has no password hash');
    return;
  }
  console.log('✅ Password hash exists');

  const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
  if (!isValidPassword) {
    console.error('❌ Password verification failed');
    return;
  }
  console.log('✅ Password verified successfully');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 AUTHENTICATION TEST PASSED!');
  console.log('='.repeat(60));
  console.log('\nLogin credentials:');
  console.log('  Email: admin@clearchoicephotos.com');
  console.log('  Password: Cl3@rCh01c3!2025$');
  console.log('  Company: default');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run dev');
  console.log('  2. Go to: http://localhost:3000/auth/signin');
  console.log('  3. Log in with the credentials above');
}

testAuthentication().catch(console.error);
