/**
 * CSV Export Utility
 * 
 * Exports data to CSV format with proper escaping and formatting
 */

export interface CSVColumn {
  key: string
  label: string
}

/**
 * Export array of objects to CSV file
 * 
 * @param data - Array of objects to export
 * @param filename - Name of the downloaded file
 * @param columns - Column definitions (key = object property, label = CSV header)
 */
export function exportToCSV(data: any[], filename: string, columns: CSVColumn[]) {
  // Create CSV header
  const header = columns.map(col => escapeCSVValue(col.label)).join(',')
  
  // Create CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = getNestedValue(row, col.key)
      return escapeCSVValue(value)
    }).join(',')
  }).join('\n')
  
  const csv = header + '\n' + rows
  
  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up object URL
  URL.revokeObjectURL(url)
}

/**
 * Get nested value from object using dot notation
 * e.g., 'account.name' gets obj.account.name
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let value = obj
  
  for (const key of keys) {
    if (value === null || value === undefined) return ''
    value = value[key]
  }
  
  return value
}

/**
 * Escape and format value for CSV
 * - Handles null/undefined
 * - Handles arrays (joins with semicolon)
 * - Handles objects (JSON stringify)
 * - Escapes quotes
 * - Wraps in quotes if contains comma, quote, or newline
 */
function escapeCSVValue(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) return ''
  
  // Handle boolean
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  
  // Handle numbers
  if (typeof value === 'number') return String(value)
  
  // Handle arrays
  if (Array.isArray(value)) {
    return escapeCSVValue(value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('; '))
  }
  
  // Handle objects
  if (typeof value === 'object') {
    return escapeCSVValue(JSON.stringify(value))
  }
  
  // Convert to string
  const strValue = String(value)
  
  // If contains special characters, escape and wrap in quotes
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n') || strValue.includes('\r')) {
    // Escape quotes by doubling them
    const escaped = strValue.replace(/"/g, '""')
    return `"${escaped}"`
  }
  
  return strValue
}

/**
 * Format date for CSV export
 */
export function formatDateForCSV(dateString: string | null): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return dateString
  }
}
