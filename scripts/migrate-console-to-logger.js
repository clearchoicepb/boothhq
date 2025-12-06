#!/usr/bin/env node
/**
 * Script to migrate console.log/error/warn to Pino logger
 * 
 * Usage: node scripts/migrate-console-to-logger.js [directory]
 * Example: node scripts/migrate-console-to-logger.js src/app/api
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'src/app/api';

// Get module name from file path
function getModuleName(filePath) {
  // Extract meaningful module name from path
  // e.g., src/app/api/events/[id]/route.ts -> api:events
  const parts = filePath.split(path.sep);
  const apiIndex = parts.indexOf('api');
  if (apiIndex === -1) {
    // For non-api files, use the folder name
    const folder = parts[parts.length - 2] || 'app';
    return folder.replace(/[\[\]]/g, '');
  }
  
  // Get the resource name (first folder after api)
  const resourceName = parts[apiIndex + 1] || 'api';
  return `api:${resourceName.replace(/[\[\]]/g, '')}`;
}

// Check if file already has logger import
function hasLoggerImport(content) {
  return content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');
}

// Check if file has console statements
function hasConsoleStatements(content) {
  return /console\.(log|error|warn|debug|info)/.test(content);
}

// Add logger import and const
function addLoggerImport(content, moduleName) {
  // Find the last import statement
  const importRegex = /^import .+ from .+$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }
  
  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    const before = content.slice(0, insertPos);
    const after = content.slice(insertPos);
    
    const loggerImport = `\nimport { createLogger } from '@/lib/logger'\n\nconst log = createLogger('${moduleName}')`;
    
    return before + loggerImport + after;
  }
  
  // No imports found, add at top
  return `import { createLogger } from '@/lib/logger'\n\nconst log = createLogger('${moduleName}')\n\n${content}`;
}

// Transform console statements to logger
function transformConsoleStatements(content) {
  let result = content;
  
  // Pattern 1: console.error('message', error) or console.error('message:', error)
  // -> log.error({ error }, 'message')
  result = result.replace(
    /console\.error\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, message, varName) => {
      const cleanMessage = message.replace(/:?\s*$/, '');
      return `log.error({ ${varName} }, '${cleanMessage}')`;
    }
  );
  
  // Pattern 2: console.error('message', JSON.stringify(x, null, 2))
  // -> log.error({ x }, 'message')
  result = result.replace(
    /console\.error\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*JSON\.stringify\s*\(\s*(\w+)[^)]*\)\s*\)/g,
    (match, quote, message, varName) => {
      const cleanMessage = message.replace(/:?\s*$/, '');
      return `log.error({ ${varName} }, '${cleanMessage}')`;
    }
  );
  
  // Pattern 3: console.log('[PREFIX]', ...) debug logs
  // -> log.debug({ ... }, 'message')
  result = result.replace(
    /console\.log\s*\(\s*(['"`])\[([^\]]+)\][^'"`]*\1[^)]*\)/g,
    (match) => {
      // For complex debug logs, simplify to just the key info
      return match
        .replace('console.log', 'log.debug')
        .replace(/\[([^\]]+)\]\s*/, '')
        .replace(/,\s*(['"`])([^'"`]+)\1$/, ", '$2'");
    }
  );
  
  // Pattern 4: Simple console.log('message')
  // -> log.debug('message')
  result = result.replace(
    /console\.log\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
    "log.debug('$2')"
  );
  
  // Pattern 5: console.warn('message')
  // -> log.warn('message')
  result = result.replace(
    /console\.warn\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
    "log.warn('$2')"
  );
  
  // Pattern 6: console.warn('message', data)
  // -> log.warn({ data }, 'message')
  result = result.replace(
    /console\.warn\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*(\w+)\s*\)/g,
    (match, quote, message, varName) => {
      const cleanMessage = message.replace(/:?\s*$/, '');
      return `log.warn({ ${varName} }, '${cleanMessage}')`;
    }
  );
  
  // Pattern 7: Remaining console.error with just message
  result = result.replace(
    /console\.error\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g,
    "log.error('$2')"
  );
  
  return result;
}

// Process a single file
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if no console statements
  if (!hasConsoleStatements(content)) {
    return { skipped: true, reason: 'no console statements' };
  }
  
  // Skip if already has logger
  if (hasLoggerImport(content)) {
    return { skipped: true, reason: 'already has logger' };
  }
  
  const moduleName = getModuleName(filePath);
  
  // Add logger import
  let newContent = addLoggerImport(content, moduleName);
  
  // Transform console statements
  newContent = transformConsoleStatements(newContent);
  
  // Only write if content changed
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return { modified: true, moduleName };
  }
  
  return { skipped: true, reason: 'no changes needed' };
}

// Recursively find all .ts and .tsx files
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        findFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main
console.log(`\n🔄 Migrating console.* to logger in: ${targetDir}\n`);

const files = findFiles(targetDir);
let modified = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  try {
    const result = processFile(file);
    if (result.modified) {
      console.log(`✅ ${file} (module: ${result.moduleName})`);
      modified++;
    } else {
      skipped++;
    }
  } catch (err) {
    errors.push({ file, error: err.message });
    console.log(`❌ ${file}: ${err.message}`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Modified: ${modified} files`);
console.log(`   Skipped:  ${skipped} files`);
console.log(`   Errors:   ${errors.length} files\n`);

if (errors.length > 0) {
  console.log('Errors:');
  errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
}

