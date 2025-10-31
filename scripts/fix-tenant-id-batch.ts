#!/usr/bin/env ts-node
/**
 * Batch Tenant ID Fix Script
 *
 * Automatically fixes common tenant_id mapping issues in API route files.
 *
 * Changes made:
 * 1. Replaces manual session checks with getTenantContext()
 * 2. Replaces session.user.tenantId with dataSourceTenantId in queries/inserts
 * 3. Updates imports to use getTenantContext helper
 *
 * Usage:
 *   npx ts-node scripts/fix-tenant-id-batch.ts <file1> <file2> ...
 *   npx ts-node scripts/fix-tenant-id-batch.ts src/app/api/events/[id]/route.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface FixResult {
  file: string;
  success: boolean;
  changesCount: number;
  error?: string;
}

/**
 * Fix a single file
 */
function fixFile(filePath: string): FixResult {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changesCount = 0;

    // Skip if already using getTenantContext
    if (content.includes('getTenantContext')) {
      return {
        file: filePath,
        success: true,
        changesCount: 0,
      };
    }

    // Pattern 1: Replace import statements
    // Add getTenantContext to imports if not present
    if (content.includes('getTenantDatabaseClient')) {
      const oldImport = /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/supabase-client['"]/;
      const match = content.match(oldImport);

      if (match) {
        // Remove getTenantDatabaseClient and getServerSession/authOptions imports
        content = content.replace(
          /import\s*\{[^}]*getTenantDatabaseClient[^}]*\}\s*from\s*['"]@\/lib\/supabase-client['"];?\s*\n?/g,
          ''
        );

        content = content.replace(
          /import\s*\{[^}]*getServerSession[^}]*\}\s*from\s*['"]next-auth['"];?\s*\n?/g,
          ''
        );

        content = content.replace(
          /import\s*\{[^}]*authOptions[^}]*\}\s*from\s*['"]@\/lib\/auth['"];?\s*\n?/g,
          ''
        );

        // Add getTenantContext import at the top
        const firstImport = content.match(/import\s/);
        if (firstImport && firstImport.index !== undefined) {
          content =
            content.slice(0, firstImport.index) +
            "import { getTenantContext } from '@/lib/tenant-helpers'\n" +
            content.slice(firstImport.index);
          changesCount++;
        }
      }
    }

    // Pattern 2: Replace GET/POST/PUT/PATCH/DELETE handler patterns
    // Replace manual session checks with getTenantContext()
    const handlerPattern = /(export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)\s*\{[\s\S]*?)(\n\s*const\s+session\s*=\s*await\s+getServerSession\(authOptions\)[\s\S]*?if\s*\([^)]*!session[\s\S]*?\}\s*\n)/;

    content = content.replace(handlerPattern, (match, before, method, sessionCheck) => {
      changesCount++;
      return `${before}
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
`;
    });

    // Pattern 3: Replace getTenantDatabaseClient calls
    content = content.replace(
      /const\s+supabase\s*=\s*await\s+getTenantDatabaseClient\([^)]+\)\s*\n?/g,
      () => {
        changesCount++;
        return ''; // Remove these lines as supabase is now from context
      }
    );

    // Pattern 4: Replace session.user.tenantId with dataSourceTenantId in queries
    // In .eq('tenant_id', ...) calls
    content = content.replace(
      /\.eq\(\s*['"]tenant_id['"]\s*,\s*session\.user\.tenantId\s*\)/g,
      () => {
        changesCount++;
        return ".eq('tenant_id', dataSourceTenantId)";
      }
    );

    // Pattern 5: Replace session?.user?.tenantId with dataSourceTenantId in queries
    content = content.replace(
      /\.eq\(\s*['"]tenant_id['"]\s*,\s*session\?\.user\?\.tenantId\s*\)/g,
      () => {
        changesCount++;
        return ".eq('tenant_id', dataSourceTenantId)";
      }
    );

    // Pattern 6: Replace tenant_id: session.user.tenantId in object literals
    content = content.replace(
      /tenant_id:\s*session\.user\.tenantId([,\s}])/g,
      (match, after) => {
        changesCount++;
        return `tenant_id: dataSourceTenantId${after}`;
      }
    );

    // Pattern 7: Replace tenant_id: session?.user?.tenantId in object literals
    content = content.replace(
      /tenant_id:\s*session\?\.user\?\.tenantId([,\s}])/g,
      (match, after) => {
        changesCount++;
        return `tenant_id: dataSourceTenantId${after}`;
      }
    );

    // Pattern 8: Fix conditional checks that reference session.user.tenantId
    // But preserve session.user.tenantSubdomain and other session uses
    content = content.replace(
      /if\s*\(\s*!session\?\.user\?\.tenantId\s*\)\s*\{[\s\S]*?\}/g,
      () => {
        // This is now handled by getTenantContext(), so we can remove these checks
        return ''; // They're redundant after getTenantContext()
      }
    );

    // Write the fixed content back
    if (changesCount > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    return {
      file: filePath,
      success: true,
      changesCount,
    };
  } catch (error: any) {
    return {
      file: filePath,
      success: false,
      changesCount: 0,
      error: error.message,
    };
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx ts-node scripts/fix-tenant-id-batch.ts <file1> <file2> ...');
    console.error('');
    console.error('Example:');
    console.error('  npx ts-node scripts/fix-tenant-id-batch.ts src/app/api/events/[id]/route.ts');
    console.error('  npx ts-node scripts/fix-tenant-id-batch.ts src/app/api/events/**/*.ts');
    process.exit(1);
  }

  const results: FixResult[] = [];

  for (const filePath of args) {
    // Skip non-existent files
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }

    const result = fixFile(filePath);
    results.push(result);

    if (result.success) {
      if (result.changesCount > 0) {
        console.log(`✅ ${filePath} (${result.changesCount} changes)`);
      } else {
        console.log(`⏭️  ${filePath} (already fixed or no changes needed)`);
      }
    } else {
      console.error(`❌ ${filePath}: ${result.error}`);
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                           SUMMARY                             ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const fixed = results.filter((r) => r.changesCount > 0);
  const totalChanges = results.reduce((sum, r) => sum + r.changesCount, 0);

  console.log(`Total files processed: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`🔧 Files modified: ${fixed.length}`);
  console.log(`📝 Total changes: ${totalChanges}`);
  console.log('');

  if (failed.length > 0) {
    console.log('Failed files:');
    failed.forEach((r) => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
    process.exit(1);
  }
}

// Run if called directly
main();

export { fixFile };
