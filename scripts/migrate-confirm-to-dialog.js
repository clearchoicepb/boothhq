#!/usr/bin/env node
/**
 * Script to help identify confirm() calls that need manual migration
 * 
 * Unlike alert() which can be auto-replaced with toast(), confirm() dialogs
 * require more careful handling because they:
 * 1. Block execution until user responds
 * 2. Return a boolean value
 * 3. Need to be converted to async/await pattern with state
 * 
 * This script lists all confirm() usages for manual review.
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'src';

function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        findFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function analyzeConfirmCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const matches = [];
  
  lines.forEach((line, index) => {
    if (/\bconfirm\s*\(/.test(line)) {
      // Determine the type of confirm
      const lowerLine = line.toLowerCase();
      let type = 'generic';
      
      if (lowerLine.includes('delete') || lowerLine.includes('remove')) {
        type = 'delete';
      } else if (lowerLine.includes('duplicate') || lowerLine.includes('copy')) {
        type = 'duplicate';
      } else if (lowerLine.includes('sure')) {
        type = 'confirmation';
      }
      
      matches.push({
        line: index + 1,
        content: line.trim(),
        type
      });
    }
  });
  
  return matches;
}

// Main
console.log(`\n🔍 Analyzing confirm() calls in: ${targetDir}\n`);

const files = findFiles(targetDir);
const results = [];

for (const file of files) {
  const matches = analyzeConfirmCalls(file);
  if (matches.length > 0) {
    results.push({ file, matches });
  }
}

// Group by type for easier processing
const byType = {
  delete: [],
  duplicate: [],
  confirmation: [],
  generic: []
};

results.forEach(({ file, matches }) => {
  matches.forEach(match => {
    byType[match.type].push({ file, ...match });
  });
});

console.log('📋 CONFIRM CALLS BY TYPE:\n');

console.log('🗑️  DELETE CONFIRMATIONS (can use confirmDelete helper):');
byType.delete.forEach(m => {
  console.log(`   ${m.file}:${m.line}`);
  console.log(`      ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
});

console.log('\n📄 DUPLICATE CONFIRMATIONS:');
byType.duplicate.forEach(m => {
  console.log(`   ${m.file}:${m.line}`);
  console.log(`      ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
});

console.log('\n✅ OTHER CONFIRMATIONS:');
[...byType.confirmation, ...byType.generic].forEach(m => {
  console.log(`   ${m.file}:${m.line}`);
  console.log(`      ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`);
});

console.log(`\n📊 Summary:`);
console.log(`   Delete confirmations: ${byType.delete.length}`);
console.log(`   Duplicate confirmations: ${byType.duplicate.length}`);
console.log(`   Other confirmations: ${byType.confirmation.length + byType.generic.length}`);
console.log(`   Total: ${results.reduce((sum, r) => sum + r.matches.length, 0)}`);
console.log(`   Files affected: ${results.length}\n`);

