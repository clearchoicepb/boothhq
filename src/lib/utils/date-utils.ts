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

/**
 * Format a time string from 24-hour to 12-hour with AM/PM
 * 
 * @param timeString - Time string in HH:mm or HH:mm:ss format
 * @returns Formatted time (e.g., '2:30 PM')
 * 
 * @example
 * formatTime('14:30')
 * // → '2:30 PM'
 * 
 * formatTime('09:15:00')
 * // → '9:15 AM'
 */
export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return ''
  
  try {
    // Handle HH:mm or HH:mm:ss format
    const [hoursStr, minutesStr] = timeString.split(':')
    const hours = parseInt(hoursStr)
    const minutes = minutesStr || '00'
    
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    
    return `${hours12}:${minutes} ${ampm}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return timeString
  }
}

/**
 * Format a date and time together for display
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timeString - Time string in HH:mm or HH:mm:ss format
 * @returns Formatted datetime (e.g., 'Jan 15, 2025 - 2:30 PM')
 *
 * @example
 * formatDateTime('2025-01-15', '14:30')
 * // → 'Jan 15, 2025 - 2:30 PM'
 *
 * formatDateTime('2025-01-15', null)
 * // → 'Jan 15, 2025'
 */
export function formatDateTime(
  dateString: string | null | undefined,
  timeString: string | null | undefined
): string {
  const datePart = formatDate(dateString)
  const timePart = formatTime(timeString)

  if (timePart) {
    return `${datePart} - ${timePart}`
  }

  return datePart
}

/**
 * Convert a datetime string to datetime-local input format
 * NO TIMEZONE CONVERSION - preserves the exact time entered/stored
 *
 * @param datetimeString - DateTime string in various formats
 * @returns DateTime string in format YYYY-MM-DDTHH:mm for datetime-local input
 *
 * @example
 * toDateTimeLocalValue('2025-01-15T14:30:00')
 * // → '2025-01-15T14:30'
 *
 * toDateTimeLocalValue('2025-01-15 14:30:00')
 * // → '2025-01-15T14:30'
 *
 * @important This function does NOT convert timezones. Time entered = time displayed.
 */
export function toDateTimeLocalValue(datetimeString: string | null | undefined): string {
  if (!datetimeString) return ''

  try {
    // Handle different datetime formats and extract the datetime portion
    let cleaned = datetimeString.trim()

    // If it already has the format YYYY-MM-DDTHH:mm, extract just that
    const match = cleaned.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/)

    if (match) {
      return `${match[1]}T${match[2]}`
    }

    // If it's just a date with no time, return empty to avoid confusion
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return ''
    }

    return ''
  } catch (error) {
    console.error('Error converting datetime to local value:', error)
    return ''
  }
}

/**
 * Format a datetime-local input value for display
 * NO TIMEZONE CONVERSION - displays the exact time stored
 *
 * @param datetimeString - DateTime string in YYYY-MM-DDTHH:mm format
 * @returns Formatted datetime string (e.g., 'Jan 15, 2025 at 2:30 PM')
 *
 * @example
 * formatDateTimeLocal('2025-01-15T14:30')
 * // → 'Jan 15, 2025 at 2:30 PM'
 *
 * @important This function does NOT convert timezones. Time entered = time displayed.
 */
export function formatDateTimeLocal(datetimeString: string | null | undefined): string {
  if (!datetimeString) return 'Not set'

  try {
    // Split into date and time components without timezone conversion
    const match = datetimeString.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/)

    if (match) {
      const dateStr = match[1]
      const timeStr = match[2]

      const datePart = formatDate(dateStr)
      const timePart = formatTime(timeStr)

      return `${datePart} at ${timePart}`
    }

    return 'Invalid format'
  } catch (error) {
    console.error('Error formatting datetime local:', error)
    return 'Not set'
  }
}

