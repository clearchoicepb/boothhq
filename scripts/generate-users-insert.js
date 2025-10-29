#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const appSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function formatValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // Escape single quotes in strings
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function generateInsert() {
  console.log('Fetching users from App DB...\n');
  
  const { data: users, error } = await appSupabase
    .from('users')
    .select('*')
    .order('created_at');

  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }

  console.log(`Found ${users.length} users\n`);

  const columns = [
    'id', 'tenant_id', 'email', 'first_name', 'last_name', 'role', 'status',
    'last_login', 'created_at', 'updated_at', 'password_hash', 'phone', 'avatar_url', 'permissions',
    'address_line_1', 'address_line_2', 'city', 'state', 'zip_code',
    'job_title', 'department', 'employee_type', 'pay_rate', 'payroll_info',
    'hire_date', 'termination_date', 'emergency_contact_name', 'emergency_contact_phone',
    'emergency_contact_relationship', 'last_login_at', 'is_active'
  ];

  let sql = `INSERT INTO users (\n  ${columns.join(', ')}\n) VALUES\n`;

  const values = users.map((user, index) => {
    const vals = columns.map(col => formatValue(user[col]));
    const isLast = index === users.length - 1;
    return `  (${vals.join(', ')})${isLast ? '' : ','}`;
  });

  sql += values.join('\n');
  sql += '\nON CONFLICT (id) DO NOTHING;\n';

  // Write to file
  const outputPath = path.join(__dirname, 'users-insert-data.sql');
  fs.writeFileSync(outputPath, sql);

  console.log(`✅ Generated INSERT statements for ${users.length} users`);
  console.log(`📄 Saved to: ${outputPath}\n`);
  
  // Also print summary
  console.log('Users by role:');
  const roleCounts = {};
  users.forEach(u => {
    roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
  });
  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });
}

generateInsert().catch(console.error);

