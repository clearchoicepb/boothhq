#!/usr/bin/env node
/**
 * Script to migrate alert() calls to toast notifications
 * 
 * Usage: node scripts/migrate-alerts-to-toast.js [directory]
 * Example: node scripts/migrate-alerts-to-toast.js src/app
 * 
 * This handles:
 * - alert('Success message') → toast.success('Success message')
 * - alert('Error: ...') → toast.error('...')
 * - alert('Failed...') → toast.error('Failed...')
 * - alert('message') with generic messages → toast('message')
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'src';

// Check if file already has toast import
function hasToastImport(content) {
  return content.includes("from 'react-hot-toast'") || content.includes('from "react-hot-toast"');
}

// Check if file has alert calls
function hasAlertCalls(content) {
  return /\balert\s*\(/.test(content);
}

// Add toast import if not present
function addToastImport(content) {
  if (hasToastImport(content)) {
    return content;
  }
  
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
    return before + "\nimport toast from 'react-hot-toast'" + after;
  }
  
  // No imports found, add at top after 'use client'
  if (content.startsWith("'use client'")) {
    return content.replace("'use client'", "'use client'\n\nimport toast from 'react-hot-toast'");
  }
  
  return "import toast from 'react-hot-toast'\n\n" + content;
}

// Determine toast type based on message content
function getToastType(message) {
  const lowerMessage = message.toLowerCase();
  
  // Error patterns
  if (
    lowerMessage.includes('error') ||
    lowerMessage.includes('failed') ||
    lowerMessage.includes('unable') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('could not') ||
    lowerMessage.includes('cannot') ||
    lowerMessage.includes('please ') // validation messages
  ) {
    return 'error';
  }
  
  // Success patterns
  if (
    lowerMessage.includes('success') ||
    lowerMessage.includes('created') ||
    lowerMessage.includes('updated') ||
    lowerMessage.includes('saved') ||
    lowerMessage.includes('deleted') ||
    lowerMessage.includes('sent') ||
    lowerMessage.includes('added') ||
    lowerMessage.includes('completed') ||
    lowerMessage.includes('converted') ||
    lowerMessage.includes('copied')
  ) {
    return 'success';
  }
  
  // Default to plain toast
  return '';
}

// Transform alert calls to toast
function transformAlerts(content) {
  let result = content;
  
  // Pattern 1: alert('string literal')
  result = result.replace(
    /\balert\s*\(\s*(['"`])([^'"`]*)\1\s*\)/g,
    (match, quote, message) => {
      const toastType = getToastType(message);
      // Clean up message - remove "Error: " prefix if using toast.error
      let cleanMessage = message;
      if (toastType === 'error') {
        cleanMessage = message.replace(/^Error:\s*/i, '').replace(/^Failed:\s*/i, '');
      }
      
      if (toastType) {
        return `toast.${toastType}('${cleanMessage.replace(/'/g, "\\'")}')`;
      }
      return `toast('${cleanMessage.replace(/'/g, "\\'")}')`;
    }
  );
  
  // Pattern 2: alert(`template literal`)
  result = result.replace(
    /\balert\s*\(\s*`([^`]*)`\s*\)/g,
    (match, message) => {
      const toastType = getToastType(message);
      if (toastType) {
        return `toast.${toastType}(\`${message}\`)`;
      }
      return `toast(\`${message}\`)`;
    }
  );
  
  // Pattern 3: alert(variable) or alert(expression) - leave as toast()
  result = result.replace(
    /\balert\s*\(\s*([^'"`\s][^)]*)\s*\)/g,
    (match, expression) => {
      // Skip if already transformed
      if (expression.startsWith('toast')) return match;
      // Skip complex multi-line expressions
      if (expression.includes('\n')) return match;
      return `toast(${expression})`;
    }
  );
  
  return result;
}

// Process a single file
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if no alert calls
  if (!hasAlertCalls(content)) {
    return { skipped: true, reason: 'no alert calls' };
  }
  
  // Skip README files
  if (filePath.endsWith('.md')) {
    return { skipped: true, reason: 'markdown file' };
  }
  
  // Add toast import and transform alerts
  let newContent = addToastImport(content);
  newContent = transformAlerts(newContent);
  
  // Only write if content changed
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return { modified: true };
  }
  
  return { skipped: true, reason: 'no changes needed' };
}

// Recursively find all .ts and .tsx files
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

// Main
console.log(`\n🔄 Migrating alert() to toast() in: ${targetDir}\n`);

const files = findFiles(targetDir);
let modified = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  try {
    const result = processFile(file);
    if (result.modified) {
      console.log(`✅ ${file}`);
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

