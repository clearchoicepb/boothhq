#!/usr/bin/env node

/**
 * Comprehensive fix for remaining old authentication patterns
 *
 * Converts all POST/PUT/PATCH/DELETE functions from:
 *   const session = await getServerSession(authOptions)
 *
 * To:
 *   const context = await getTenantContext()
 *   if (context instanceof NextResponse) return context
 *   const { supabase, dataSourceTenantId, session } = context
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/api/accounts/[id]/route.ts',
  'src/app/api/accounts/route.ts',
  'src/app/api/add-ons/[id]/route.ts',
  'src/app/api/add-ons/route.ts',
  'src/app/api/attachments/[id]/route.ts',
  'src/app/api/attachments/route.ts',
  'src/app/api/booth-assignments/[id]/route.ts',
  'src/app/api/booth-assignments/route.ts',
  'src/app/api/booth-types/[id]/route.ts',
  'src/app/api/booth-types/route.ts',
  'src/app/api/booths/[id]/route.ts',
  'src/app/api/booths/route.ts',
  'src/app/api/communications/[id]/route.ts',
  'src/app/api/communications/route.ts',
  'src/app/api/contact-accounts/route.ts',
  'src/app/api/contacts/[id]/route.ts',
  'src/app/api/contacts/route.ts',
  'src/app/api/contracts/route.ts',
  'src/app/api/core-task-templates/route.ts',
  'src/app/api/debug/performance/route.ts',
  'src/app/api/debug/tenant-config/route.ts',
  'src/app/api/debug/tenant-connection/route.ts',
  'src/app/api/entities/[entity]/route.ts',
  'src/app/api/equipment-categories/route.ts',
  'src/app/api/equipment-items/[id]/route.ts',
  'src/app/api/equipment-items/route.ts',
  'src/app/api/equipment-types/[id]/route.ts',
  'src/app/api/equipment-types/route.ts',
  'src/app/api/equipment/[id]/route.ts',
  'src/app/api/equipment/route.ts',
  'src/app/api/event-dates/[id]/route.ts',
  'src/app/api/event-dates/route.ts',
  'src/app/api/event-staff/[id]/route.ts',
  'src/app/api/event-staff/route.ts',
  'src/app/api/events/[id]/route.ts',
  'src/app/api/invoices/[id]/pay/route.ts',
  'src/app/api/invoices/[id]/route.ts',
  'src/app/api/invoices/route.ts',
  'src/app/api/leads/[id]/route.ts',
  'src/app/api/leads/route.ts',
  'src/app/api/locations/[id]/route.ts',
  'src/app/api/locations/route.ts',
  'src/app/api/notes/[id]/route.ts',
  'src/app/api/notes/route.ts',
  'src/app/api/opportunities/[id]/line-items/[lineItemId]/route.ts',
  'src/app/api/opportunities/[id]/line-items/route.ts',
  'src/app/api/opportunities/[id]/route.ts',
  'src/app/api/opportunities/route.ts',
  'src/app/api/packages/[id]/route.ts',
  'src/app/api/packages/route.ts',
  'src/app/api/quotes/[id]/route.ts',
  'src/app/api/quotes/route.ts',
  'src/app/api/staff-roles/[id]/route.ts',
  'src/app/api/staff-roles/route.ts',
  'src/app/api/tasks/[id]/route.ts',
  'src/app/api/tasks/route.ts',
  'src/app/api/templates/[id]/route.ts',
  'src/app/api/templates/route.ts',
  'src/app/api/users/[id]/route.ts',
  'src/app/api/users/route.ts',
];

let totalChanges = 0;
let filesModified = 0;

console.log('🔧 Starting comprehensive authentication pattern fix...\n');

filesToFix.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let fileChanges = 0;

  // Pattern 1: Replace old session check with getTenantContext
  // Match: const session = await getServerSession(authOptions)
  // Replace with getTenantContext pattern
  const oldSessionPattern = /const session = await getServerSession\(authOptions\)\s*\n\s*\n\s*if \(!session\?\.\user\) \{\s*\n\s*return NextResponse\.json\(\{ error: '[^']*' \}, \{ status: 401 \}\)\s*\n\s*\}/g;

  if (oldSessionPattern.test(content)) {
    content = content.replace(
      oldSessionPattern,
      `const context = await getTenantContext()\n    if (context instanceof NextResponse) return context\n\n    const { supabase, dataSourceTenantId, session } = context`
    );
    fileChanges++;
  }

  // Pattern 2: Simpler session check without user
  const simpleSessionPattern = /const session = await getServerSession\(authOptions\)\s*\n\s*if \(!session\) \{\s*\n\s*return NextResponse\.json\(\{ error: '[^']*' \}, \{ status: 401 \}\)\s*\n\s*\}/g;

  if (simpleSessionPattern.test(content)) {
    content = content.replace(
      simpleSessionPattern,
      `const context = await getTenantContext()\n    if (context instanceof NextResponse) return context\n\n    const { supabase, dataSourceTenantId, session } = context`
    );
    fileChanges++;
  }

  // Pattern 3: Just the session line followed by other code
  const justSessionPattern = /const session = await getServerSession\(authOptions\)\s*\n/g;

  if (justSessionPattern.test(content)) {
    content = content.replace(
      justSessionPattern,
      `const context = await getTenantContext()\n    if (context instanceof NextResponse) return context\n\n    const { supabase, dataSourceTenantId, session } = context\n`
    );
    fileChanges++;
  }

  // Pattern 4: Replace createServerSupabaseClient with already-available supabase
  const supabaseClientPattern = /const supabase = createServerSupabaseClient\(\)/g;
  if (supabaseClientPattern.test(content)) {
    content = content.replace(supabaseClientPattern, '// supabase already available from context');
    fileChanges++;
  }

  // Pattern 5: Replace await getTenantDatabaseClient with already-available supabase
  const tenantDbPattern = /const supabase = await getTenantDatabaseClient\(session\.user\.tenantId\)/g;
  if (tenantDbPattern.test(content)) {
    content = content.replace(tenantDbPattern, '// supabase already available from context');
    fileChanges++;
  }

  // Pattern 6: Replace session.user.tenantId with dataSourceTenantId in queries
  const tenantIdPattern = /session\.user\.tenantId/g;
  const tenantIdMatches = content.match(tenantIdPattern);
  if (tenantIdMatches) {
    content = content.replace(tenantIdPattern, 'dataSourceTenantId');
    fileChanges += tenantIdMatches.length;
  }

  // Pattern 7: Remove unused imports if they exist
  if (fileChanges > 0) {
    // Check if getServerSession is still used elsewhere in file
    if (!content.includes('getServerSession(') && content.includes('import { getServerSession }')) {
      content = content.replace(/import \{ getServerSession \} from ['"]next-auth['"]\s*\n/, '');
      content = content.replace(/import \{ authOptions \} from ['"]@\/lib\/auth['"]\s*\n/, '');
      fileChanges++;
    }

    // Check if createServerSupabaseClient is still used
    if (!content.includes('createServerSupabaseClient(') && content.includes('createServerSupabaseClient')) {
      content = content.replace(/,?\s*createServerSupabaseClient/, '');
      fileChanges++;
    }

    // Check if getTenantDatabaseClient is still used
    if (!content.includes('getTenantDatabaseClient(') && content.includes('getTenantDatabaseClient')) {
      content = content.replace(/,?\s*getTenantDatabaseClient/, '');
      fileChanges++;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    filesModified++;
    totalChanges += fileChanges;
    console.log(`✅ ${filePath} (${fileChanges} changes)`);
  } else {
    console.log(`⏭️  ${filePath} (no changes needed)`);
  }
});

console.log(`\n✨ Comprehensive fix complete!`);
console.log(`   Files modified: ${filesModified}/${filesToFix.length}`);
console.log(`   Total changes: ${totalChanges}`);
console.log(`\n📋 Changes applied:`);
console.log(`   ✓ Replaced getServerSession with getTenantContext`);
console.log(`   ✓ Replaced session.user.tenantId with dataSourceTenantId`);
console.log(`   ✓ Removed duplicate supabase client initialization`);
console.log(`   ✓ Cleaned up unused imports`);
