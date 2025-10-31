#!/usr/bin/env ts-node
/**
 * Tenant ID Usage Verification Script
 *
 * Scans the codebase for tenant_id usage patterns and identifies files
 * that may need to be updated to use getTenantIdInDataSource() mapping.
 *
 * Usage:
 *   npx ts-node scripts/verify-tenant-id-usage.ts
 *
 * Or add to package.json:
 *   "scripts": {
 *     "verify:tenant-id": "ts-node scripts/verify-tenant-id-usage.ts"
 *   }
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  file: string;
  line: number;
  pattern: string;
  context: string;
  severity: 'error' | 'warning' | 'info';
  recommendation: string;
}

const findings: Finding[] = [];

/**
 * Recursively scan directory for TypeScript files
 */
function scanDirectory(dir: string, filePattern: RegExp = /\.(ts|tsx)$/): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    // Skip node_modules, .next, and other build directories
    if (item === 'node_modules' || item === '.next' || item === 'dist' || item === 'build') {
      continue;
    }

    if (stat.isDirectory()) {
      files.push(...scanDirectory(fullPath, filePattern));
    } else if (stat.isFile() && filePattern.test(item)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check if file uses getTenantIdInDataSource
 */
function usesGetTenantIdInDataSource(content: string): boolean {
  return content.includes('getTenantIdInDataSource');
}

/**
 * Check if file imports getTenantDatabaseClient
 */
function importsGetTenantDatabaseClient(content: string): boolean {
  return content.includes('getTenantDatabaseClient');
}

/**
 * Find all instances of .eq('tenant_id', ...)
 */
function findTenantIdFilters(content: string, filePath: string): void {
  const lines = content.split('\n');
  const tenantIdPattern = /\.eq\(['"]tenant_id['"]\s*,\s*([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = tenantIdPattern.exec(line)) !== null) {
      const tenantIdSource = match[1].trim();

      // Skip if using a variable that might be mapped
      if (
        tenantIdSource.includes('dataSourceTenantId') ||
        tenantIdSource.includes('dataTenantId') ||
        tenantIdSource.includes('mappedTenantId')
      ) {
        findings.push({
          file: filePath,
          line: i + 1,
          pattern: `eq('tenant_id', ${tenantIdSource})`,
          context: line.trim(),
          severity: 'info',
          recommendation: '✅ Correctly using mapped tenant ID',
        });
        continue;
      }

      // Check if using session.user.tenantId or similar (likely incorrect)
      if (
        tenantIdSource.includes('session.user.tenantId') ||
        tenantIdSource.includes('session?.user?.tenantId') ||
        tenantIdSource.includes('tenantId') // Generic tenantId variable
      ) {
        findings.push({
          file: filePath,
          line: i + 1,
          pattern: `eq('tenant_id', ${tenantIdSource})`,
          context: line.trim(),
          severity: 'error',
          recommendation:
            '❌ Should use getTenantIdInDataSource() to map tenant ID before filtering',
        });
        continue;
      }

      // Unknown pattern - flag for manual review
      findings.push({
        file: filePath,
        line: i + 1,
        pattern: `eq('tenant_id', ${tenantIdSource})`,
        context: line.trim(),
        severity: 'warning',
        recommendation: '⚠️ Review manually - unclear if tenant ID is mapped correctly',
      });
    }
  }
}

/**
 * Find INSERT operations with tenant_id
 */
function findTenantIdInserts(content: string, filePath: string): void {
  const lines = content.split('\n');
  const insertPattern = /\.insert\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!insertPattern.test(line)) {
      continue;
    }

    // Check next few lines for tenant_id assignment
    const contextLines = lines.slice(i, Math.min(i + 10, lines.length)).join('\n');

    if (contextLines.includes('tenant_id:')) {
      // Check if using mapped tenant ID
      if (
        contextLines.includes('dataSourceTenantId') ||
        contextLines.includes('dataTenantId') ||
        contextLines.includes('mappedTenantId')
      ) {
        findings.push({
          file: filePath,
          line: i + 1,
          pattern: 'insert with tenant_id',
          context: line.trim(),
          severity: 'info',
          recommendation: '✅ Correctly using mapped tenant ID in insert',
        });
      } else if (
        contextLines.includes('session.user.tenantId') ||
        contextLines.includes('tenantId')
      ) {
        findings.push({
          file: filePath,
          line: i + 1,
          pattern: 'insert with tenant_id',
          context: line.trim(),
          severity: 'error',
          recommendation:
            '❌ Should use getTenantIdInDataSource() to map tenant ID before insert',
        });
      } else {
        findings.push({
          file: filePath,
          line: i + 1,
          pattern: 'insert with tenant_id',
          context: line.trim(),
          severity: 'warning',
          recommendation: '⚠️ Review manually - unclear if tenant ID is mapped correctly',
        });
      }
    }
  }
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Skip if file doesn't interact with tenant data
  if (!content.includes('tenant_id') && !content.includes('tenantId')) {
    return;
  }

  // Check patterns
  findTenantIdFilters(content, filePath);
  findTenantIdInserts(content, filePath);

  // Check for files that use getTenantDatabaseClient but NOT getTenantIdInDataSource
  if (importsGetTenantDatabaseClient(content) && !usesGetTenantIdInDataSource(content)) {
    // This is a potential issue - using tenant database but not mapping ID
    const hasDirectFiltering = content.includes("eq('tenant_id'") || content.includes('eq("tenant_id"');

    if (hasDirectFiltering) {
      findings.push({
        file: filePath,
        line: 0,
        pattern: 'File uses getTenantDatabaseClient without getTenantIdInDataSource',
        context: 'File-level check',
        severity: 'error',
        recommendation:
          '❌ File queries tenant database but may not be mapping tenant ID. Add: import { getTenantIdInDataSource } from "@/lib/supabase-client"',
      });
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning codebase for tenant_id usage patterns...\n');

  // Scan directories
  const srcDir = path.join(process.cwd(), 'src');
  const files = scanDirectory(srcDir);

  console.log(`📂 Found ${files.length} TypeScript files\n`);

  // Analyze each file
  for (const file of files) {
    analyzeFile(file);
  }

  // Group findings by severity
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const infos = findings.filter((f) => f.severity === 'info');

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                      VERIFICATION RESULTS                     ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Summary:`);
  console.log(`  ❌ Errors:   ${errors.length} (requires immediate fix)`);
  console.log(`  ⚠️  Warnings: ${warnings.length} (manual review recommended)`);
  console.log(`  ✅ Info:     ${infos.length} (correctly implemented)\n`);

  // Print errors
  if (errors.length > 0) {
    console.log('❌ ERRORS (Requires Fix)');
    console.log('─────────────────────────────────────────────────────────────────\n');

    // Group by file
    const errorsByFile = new Map<string, Finding[]>();
    for (const error of errors) {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    }

    for (const [file, fileErrors] of errorsByFile) {
      console.log(`📄 ${file.replace(process.cwd(), '')}`);
      for (const error of fileErrors) {
        if (error.line > 0) {
          console.log(`   Line ${error.line}: ${error.pattern}`);
        } else {
          console.log(`   ${error.pattern}`);
        }
        console.log(`   ${error.recommendation}`);
        if (error.context !== 'File-level check') {
          console.log(`   Code: ${error.context}`);
        }
        console.log();
      }
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Manual Review)');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const warning of warnings.slice(0, 10)) {
      // Limit to first 10
      console.log(`📄 ${warning.file.replace(process.cwd(), '')}:${warning.line}`);
      console.log(`   ${warning.recommendation}`);
      console.log(`   Code: ${warning.context}\n`);
    }

    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more warnings\n`);
    }
  }

  // Print summary with recommendations
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        RECOMMENDATIONS                        ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (errors.length > 0) {
    console.log('1. Immediate Actions Required:');
    console.log('   - Update all API routes to use getTenantContext() helper');
    console.log('   - Replace session.user.tenantId with dataSourceTenantId in queries');
    console.log('   - See docs/TENANT_ID_AUDIT.md for detailed migration guide\n');

    console.log('2. Quick Fix Pattern:');
    console.log('   ```typescript');
    console.log('   import { getTenantContext } from "@/lib/tenant-helpers";');
    console.log('');
    console.log('   export async function GET(request: NextRequest) {');
    console.log('     const context = await getTenantContext();');
    console.log('     if (context instanceof NextResponse) return context;');
    console.log('');
    console.log('     const { supabase, dataSourceTenantId } = context;');
    console.log('');
    console.log('     const { data } = await supabase');
    console.log('       .from("events")');
    console.log('       .select("*")');
    console.log('       .eq("tenant_id", dataSourceTenantId); // Use mapped ID!');
    console.log('   }');
    console.log('   ```\n');
  } else {
    console.log('✅ No critical issues found!');
    console.log('   All tenant_id usage appears to be correctly mapped.\n');
  }

  console.log('3. Documentation:');
  console.log('   - Architecture: docs/TENANT_ID_AUDIT.md');
  console.log('   - Helper Functions: src/lib/tenant-helpers.ts');
  console.log('   - DataSourceManager: src/lib/data-sources/README.md\n');

  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run main function
main();

export { main as verifyTenantIdUsage };
