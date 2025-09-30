const bcrypt = require('bcryptjs')
const fs = require('fs')

// CONFIGURATION
const ADMIN_EMAIL = 'admin@clearchoicephotos.com'
const ADMIN_PASSWORD = 'Cl3@rCh01c3!2025$'
const ADMIN_FIRST_NAME = 'Admin'
const ADMIN_LAST_NAME = 'User'
const TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18'  // Default tenant

async function generateMigration() {
  console.log('Generating admin user migration...\n')
  
  // Generate bcrypt hash (10 rounds)
  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt)
  
  console.log('Password hash generated:')
  console.log(passwordHash)
  console.log('\n')
  
  // Create the SQL migration
  const migration = `-- Add password_hash column and create admin user
-- Generated on ${new Date().toISOString()}

-- Step 1: Add password_hash column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Step 2: Create admin user
INSERT INTO users (
  id,
  tenant_id,
  email,
  first_name,
  last_name,
  role,
  status,
  password_hash,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '${TENANT_ID}',
  '${ADMIN_EMAIL}',
  '${ADMIN_FIRST_NAME}',
  '${ADMIN_LAST_NAME}',
  'admin',
  'active',
  '${passwordHash}',
  NOW(),
  NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Step 3: Verify the admin user was created
SELECT id, email, first_name, last_name, role, status, 
       CASE WHEN password_hash IS NOT NULL THEN 'Password hash exists' ELSE 'No password hash' END as password_status
FROM users 
WHERE email = '${ADMIN_EMAIL}';
`

  // Save to migration file
  const filename = 'supabase/migrations/20250930000001_create_admin_user.sql'
  fs.writeFileSync(filename, migration)
  console.log(`✅ Migration saved to: ${filename}`)
  console.log('\n')
  
  // Also create a standalone SQL file for easy copy-paste
  fs.writeFileSync('add-admin-user.sql', migration)
  console.log('✅ Standalone SQL saved to: add-admin-user.sql')
  console.log('\n')
  
  console.log('='.repeat(60))
  console.log('NEXT STEPS:')
  console.log('='.repeat(60))
  console.log('1. Go to your Supabase dashboard: https://djeeircaeqdvfgkczrwx.supabase.co')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the contents of add-admin-user.sql')
  console.log('4. Click "Run" to execute the query')
  console.log('5. Check the results to verify admin user was created')
  console.log('='.repeat(60))
  console.log('\n')
  
  // Test the password hash
  console.log('Testing password hash...')
  const isValid = await bcrypt.compare(ADMIN_PASSWORD, passwordHash)
  console.log(`Password verification test: ${isValid ? '✅ PASS' : '❌ FAIL'}`)
  console.log('\n')
  
  console.log('Admin user credentials for login:')
  console.log('='.repeat(60))
  console.log(`Email: ${ADMIN_EMAIL}`)
  console.log(`Password: ${ADMIN_PASSWORD}`)
  console.log(`Tenant subdomain: default`)
  console.log('='.repeat(60))
}

generateMigration().catch(console.error)
