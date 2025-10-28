#!/usr/bin/env node

/**
 * Script to update API routes to use tenant database
 *
 * This script updates all business data API routes to use getTenantDatabaseClient()
 * instead of createServerSupabaseClient()
 */

const fs = require('fs');
const path = require('path');

// Routes that should use APPLICATION database (keep as-is)
const APP_DB_ROUTES = [
  '/auth/',
  '/users/',
  '/migrations/',
  '/seed-data',
  '/debug/tenant-connection', // Already uses tenant DB correctly
];

// Check if route should use application DB
function shouldUseAppDb(filePath) {
  return APP_DB_ROUTES.some(route => filePath.includes(route));
}

// Check if file needs updating
function needsUpdate(content) {
  return content.includes('createServerSupabaseClient') &&
         !content.includes('getTenantDatabaseClient');
}

// Update file content
function updateFileContent(content) {
  let updated = content;

  // Update import statement
  updated = updated.replace(
    /from ['"]@\/lib\/supabase['"]/g,
    "from '@/lib/supabase-client'"
  );

  updated = updated.replace(
    /from ['"]@\/lib\/supabase-client['"]/g,
    "from '@/lib/supabase-client'"
  );

  updated = updated.replace(
    /import\s*{\s*createServerSupabaseClient\s*}/g,
    'import { getTenantDatabaseClient }'
  );

  // Update usage - look for the pattern where supabase client is created
  updated = updated.replace(
    /const\s+supabase\s*=\s*createServerSupabaseClient\(\)/g,
    'const supabase = await getTenantDatabaseClient(session.user.tenantId)'
  );

  return updated;
}

// Get all route files
function getAllRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllRouteFiles(filePath, fileList);
    } else if (file === 'route.ts' || file === 'route.tsx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main function
function main() {
  const apiDir = path.join(__dirname, '../src/app/api');
  const routes = getAllRouteFiles(apiDir);

  console.log(`\nFound ${routes.length} route files\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  routes.forEach(routePath => {
    try {
      // Check if should use app DB
      if (shouldUseAppDb(routePath)) {
        console.log(`⏭️  Skipping (app DB): ${routePath.replace(apiDir, '')}`);
        skippedCount++;
        return;
      }

      const content = fs.readFileSync(routePath, 'utf8');

      // Check if needs updating
      if (!needsUpdate(content)) {
        console.log(`✓  Already updated: ${routePath.replace(apiDir, '')}`);
        return;
      }

      // Update content
      const updated = updateFileContent(content);

      // Only write if content changed
      if (updated !== content) {
        fs.writeFileSync(routePath, updated, 'utf8');
        console.log(`✅ Updated: ${routePath.replace(apiDir, '')}`);
        updatedCount++;
      }
    } catch (error) {
      errors.push({ file: routePath, error: error.message });
      console.error(`❌ Error updating ${routePath.replace(apiDir, '')}: ${error.message}`);
    }
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`   Total routes: ${routes.length}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped (app DB): ${skippedCount}`);
  console.log(`   Already updated: ${routes.length - updatedCount - skippedCount - errors.length}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  console.log(`${'='.repeat(60)}\n`);
}

main();
