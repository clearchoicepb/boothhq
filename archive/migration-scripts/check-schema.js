const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  console.log('Checking users table schema...\n')

  // Check users table columns
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1)

  if (usersError) {
    console.error('Error querying users:', usersError)
  } else {
    console.log('Users table sample:', users)
    if (users.length > 0) {
      console.log('Columns:', Object.keys(users[0]))
    }
  }

  console.log('\nChecking tenants...\n')

  // Check tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, subdomain, status')
    .limit(5)

  if (tenantsError) {
    console.error('Error querying tenants:', tenantsError)
  } else {
    console.log('Tenants:', JSON.stringify(tenants, null, 2))
  }

  console.log('\nChecking if admin user exists...\n')

  // Check if admin user already exists
  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@clearchoicephotos.com')
    .single()

  if (adminError && adminError.code !== 'PGRST116') {
    console.error('Error checking admin user:', adminError)
  } else if (adminUser) {
    console.log('Admin user already exists:', adminUser)
  } else {
    console.log('No admin user found with email admin@clearchoicephotos.com')
  }
}

checkSchema().catch(console.error)
