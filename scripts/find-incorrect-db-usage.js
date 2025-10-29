#!/usr/bin/env node

/**
 * Find Incorrect Database Usage in Code
 * 
 * Searches for code that might be using the wrong database client
 * (using appDb directly instead of tenant-specific client)
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_TO_CHECK = [
  {
    name: 'Direct Supabase Client Import',
    pattern: /from.*['"]@\/lib\/supabase['"]/g,
    severity: 'HIGH',
    description: 'Using direct supabase client instead of tenant-specific client'
  },
  {
    name: 'createClient Usage',
    pattern: /createClient\s*\(/g,
    severity: 'MEDIUM',
    description: 'Creating Supabase client directly - verify it uses tenant routing'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL in code',
    pattern: /process\.env\.NEXT_PUBLIC_SUPABASE_URL/g,
    severity: 'HIGH',
    description: 'Using Application DB URL directly instead of tenant routing'
  },
  {
    name: 'getSupabaseClient without tenant',
    pattern: /getSupabaseClient\s*\(\s*\)/g,
    severity: 'MEDIUM',
    description: 'Getting client without tenant context'
  }
];

const DIRECTORIES_TO_SCAN = [
  'src/app/api',
  'src/hooks',
  'src/lib',
  'src/components'
];

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git'
];

function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  PATTERNS_TO_CHECK.forEach(({ name, pattern, severity, description }) => {
    const matches = [...content.matchAll(pattern)];
    
    if (matches.length > 0) {
      matches.forEach(match => {
        const lines = content.substring(0, match.index).split('\n');
        const lineNumber = lines.length;
        const lineContent = lines[lines.length - 1] + content.substring(match.index).split('\n')[0];
        
        findings.push({
          pattern: name,
          severity,
          description,
          lineNumber,
          lineContent: lineContent.trim(),
          file: filePath
        });
      });
    }
  });

  return findings;
}

function scanDirectory(dir, baseDir = '') {
  const fullPath = path.join(process.cwd(), dir);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  let findings = [];
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  entries.forEach(entry => {
    const entryPath = path.join(dir, entry.name);
    
    if (shouldIgnore(entryPath)) {
      return;
    }

    if (entry.isDirectory()) {
      findings = findings.concat(scanDirectory(entryPath, baseDir));
    } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
      const fileFindings = scanFile(path.join(process.cwd(), entryPath));
      findings = findings.concat(fileFindings);
    }
  });

  return findings;
}

function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('SCANNING FOR INCORRECT DATABASE USAGE');
  console.log('═'.repeat(80));
  console.log('\nSearching for code that might use App DB instead of Tenant DB...\n');

  let allFindings = [];

  DIRECTORIES_TO_SCAN.forEach(dir => {
    console.log(`📂 Scanning: ${dir}`);
    const findings = scanDirectory(dir);
    allFindings = allFindings.concat(findings);
  });

  // Group by severity
  const high = allFindings.filter(f => f.severity === 'HIGH');
  const medium = allFindings.filter(f => f.severity === 'MEDIUM');
  const low = allFindings.filter(f => f.severity === 'LOW');

  console.log('\n' + '═'.repeat(80));
  console.log('FINDINGS');
  console.log('═'.repeat(80));

  if (allFindings.length === 0) {
    console.log('\n✅ No potential issues found!\n');
    return;
  }

  if (high.length > 0) {
    console.log('\n🚨 HIGH SEVERITY (' + high.length + ' findings)\n');
    high.forEach(f => {
      console.log(`   ${f.file}:${f.lineNumber}`);
      console.log(`   Pattern: ${f.pattern}`);
      console.log(`   Issue: ${f.description}`);
      console.log(`   Code: ${f.lineContent}`);
      console.log('');
    });
  }

  if (medium.length > 0) {
    console.log('\n⚠️  MEDIUM SEVERITY (' + medium.length + ' findings)\n');
    medium.forEach(f => {
      console.log(`   ${f.file}:${f.lineNumber}`);
      console.log(`   Pattern: ${f.pattern}`);
      console.log(`   Code: ${f.lineContent.substring(0, 80)}${f.lineContent.length > 80 ? '...' : ''}`);
      console.log('');
    });
  }

  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nTotal findings: ${allFindings.length}`);
  console.log(`  🚨 High severity: ${high.length}`);
  console.log(`  ⚠️  Medium severity: ${medium.length}`);
  console.log(`  ℹ️  Low severity: ${low.length}`);

  console.log('\n📋 Recommended Actions:');
  console.log('   1. Review HIGH severity findings first');
  console.log('   2. Ensure API routes use getTenantDatabaseClient()');
  console.log('   3. Verify hooks use tenant-aware data fetching');
  console.log('   4. Check that forms/components get client from context\n');
}

try {
  main();
} catch (error) {
  console.error('\n💥 Error:', error.message);
  console.error(error);
  process.exit(1);
}

