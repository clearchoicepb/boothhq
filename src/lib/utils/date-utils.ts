/**
 * Date Utilities for handling date strings without timezone issues
 * 
 * Problem: Database stores dates as strings (e.g., '2025-01-15')
 * When parsing with new Date('2025-01-15'), JavaScript interprets as UTC midnight
 * This causes off-by-one errors for users in negative UTC timezones (EST, PST, etc.)
 * 
 * Solution: Parse date strings in local timezone to avoid conversion issues
 */

/**
 * Parse a date string (YYYY-MM-DD) in local timezone
 * Avoids timezone conversion issues that cause off-by-one day errors
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns Date object in local timezone
 * 
 * @example
 * // Database has: '2025-01-15'
 * // Without this utility (in EST):
 * new Date('2025-01-15') // → 2025-01-14 (off by one!)
 * 
 * // With this utility (in EST):
 * parseLocalDate('2025-01-15') // → 2025-01-15 (correct!)
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    throw new Error('Date string is required')
  }

  // Handle both date-only (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:MM:SS) formats
  // Extract just the date part if it's a datetime string
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS`)
  }

  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day)
}

/**
 * Format a date string for display
 * Handles null/undefined gracefully and avoids timezone issues
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD' or null/undefined
 * @param options - Intl.DateTimeFormat options for formatting
 * @param fallback - Text to show if date is null/undefined
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2025-01-15')
 * // → 'Jan 15, 2025'
 * 
 * formatDate('2025-01-15', { month: 'long', day: 'numeric', year: 'numeric' })
 * // → 'January 15, 2025'
 * 
 * formatDate(null, {}, 'Not set')
 * // → 'Not set'
 */
export function formatDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  },
  fallback: string = 'Not set'
): string {
  if (!dateString) {
    return fallback
  }

  try {
    const date = parseLocalDate(dateString)
    return date.toLocaleDateString('en-US', options)
  } catch (error) {
    console.error('Error formatting date:', error)
    return fallback
  }
}

/**
 * Format a date string for short display (MMM DD)
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns Short formatted date (e.g., 'Jan 15')
 * 
 * @example
 * formatDateShort('2025-01-15')
 * // → 'Jan 15'
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  
  return formatDate(dateString, {
    month: 'short',
    day: 'numeric'
  }, '-')
}

/**
 * Format a date string with full month name
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns Long formatted date (e.g., 'January 15, 2025')
 */
export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set'
  
  return formatDate(dateString, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }, 'Not set')
}

/**
 * Get days until a date (for countdown displays)
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns Number of days until the date (negative if past)
 * 
 * @example
 * getDaysUntil('2025-01-15')
 * // → 10 (if today is Jan 5, 2025)
 */
export function getDaysUntil(dateString: string | null | undefined): number | null {
  if (!dateString) return null
  
  try {
    const targetDate = parseLocalDate(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to midnight for accurate day calculation
    
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays
  } catch (error) {
    console.error('Error calculating days until:', error)
    return null
  }
}

/**
 * Check if a date is in the past
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns True if date is before today
 */
export function isDatePast(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  
  const daysUntil = getDaysUntil(dateString)
  return daysUntil !== null && daysUntil < 0
}

/**
 * Check if a date is today
 * 
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns True if date is today
 */
export function isDateToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  
  const daysUntil = getDaysUntil(dateString)
  return daysUntil === 0
}

/**
 * Convert a Date object to YYYY-MM-DD format for form inputs
 * Ensures the date is formatted in local timezone without conversion
 * 
 * @param date - Date object or date string
 * @returns Date string in YYYY-MM-DD format
 * 
 * @example
 * toDateInputValue(new Date(2025, 0, 15))
 * // → '2025-01-15'
 * 
 * toDateInputValue('2025-01-15')
 * // → '2025-01-15'
 */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  try {
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string') {
      const datePart = date.split('T')[0]
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart
      }
      // If it's a different string format, parse it first
      date = parseLocalDate(date)
    }
    
    // Convert Date object to YYYY-MM-DD in local timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('Error converting date to input value:', error)
    return ''
  }
}

