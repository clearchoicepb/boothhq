import { createLogger } from '@/lib/logger'

const log = createLogger('utils')

/**
 * Date Utilities for handling date strings without timezone issues
 *
 * All date calculations use EST (America/New_York) timezone consistently
 * to avoid timezone conversion issues across the application.
 *
 * Problem: Database stores dates as strings (e.g., '2025-01-15')
 * When parsing with new Date('2025-01-15'), JavaScript interprets as UTC midnight
 * This causes off-by-one errors for users in negative UTC timezones (EST, PST, etc.)
 *
 * Solution: Use EST timezone consistently for all date operations
 */

const EST_TIMEZONE = 'America/New_York'

/**
 * Get the current date/time in EST timezone
 * @returns Object with year, month, day, hour, minute in EST
 */
function getESTDateParts(): { year: number; month: number; day: number; hour: number; minute: number } {
  const now = new Date()
  const estString = now.toLocaleString('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  // Parse "MM/DD/YYYY, HH:MM" format
  const match = estString.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/)
  if (match) {
    return {
      month: parseInt(match[1]),
      day: parseInt(match[2]),
      year: parseInt(match[3]),
      hour: parseInt(match[4]),
      minute: parseInt(match[5])
    }
  }

  // Fallback to local time if parsing fails
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes()
  }
}

/**
 * Get today's date in EST as a Date object (midnight EST)
 * Exported for use in other modules that need consistent EST-based "today"
 */
export function getTodayEST(): Date {
  const parts = getESTDateParts()
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)
}

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
    log.error({ error }, 'Error formatting date')
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
    const today = getTodayEST() // Use EST for consistent "today" calculation

    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  } catch (error) {
    log.error({ error }, 'Error calculating days until')
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
    log.error({ error }, 'Error converting date to input value')
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
    log.error({ error }, 'Error formatting time')
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
    const cleaned = datetimeString.trim()

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
    log.error({ error }, 'Error converting datetime to local value')
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
    log.error({ error }, 'Error formatting datetime local')
    return 'Not set'
  }
}

// =====================================================
// DATE RANGE UTILITIES
// =====================================================

export interface DateRange {
  start: Date
  end: Date
  startISO: string  // YYYY-MM-DD format for database queries
  endISO: string    // YYYY-MM-DD format for database queries
}

/**
 * Get today's date range (00:00:00 to 23:59:59)
 *
 * @returns DateRange object with start and end dates for today
 *
 * @example
 * // If today is Dec 9, 2025:
 * getTodayRange()
 * // → { start: Dec 9 00:00, end: Dec 9 23:59, startISO: '2025-12-09', endISO: '2025-12-09' }
 */
export function getTodayRange(): DateRange {
  const today = getTodayEST() // Use EST for consistent date calculation

  const start = new Date(today)
  start.setHours(0, 0, 0, 0)

  const end = new Date(today)
  end.setHours(23, 59, 59, 999)

  const todayISO = toDateInputValue(start)

  return {
    start,
    end,
    startISO: todayISO,
    endISO: todayISO
  }
}

/**
 * Get the current week's date range (Monday 00:00:00 to Sunday 23:59:59)
 *
 * @returns DateRange object with start and end dates for the current week
 *
 * @example
 * // If today is Wednesday, Dec 4, 2025:
 * getWeekRange()
 * // → { start: Mon Dec 1, end: Sun Dec 7, startISO: '2025-12-01', endISO: '2025-12-07' }
 */
export function getWeekRange(): DateRange {
  const today = getTodayEST() // Use EST for consistent date calculation

  // Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = today.getDay()

  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise, go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const start = new Date(today)
  start.setDate(today.getDate() - daysToMonday)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    startISO: toDateInputValue(start),
    endISO: toDateInputValue(end)
  }
}

/**
 * Get the current month's date range (1st day 00:00:00 to last day 23:59:59)
 *
 * @returns DateRange object with start and end dates for the current month
 *
 * @example
 * // If today is Dec 15, 2025:
 * getMonthRange()
 * // → { start: Dec 1, end: Dec 31, startISO: '2025-12-01', endISO: '2025-12-31' }
 */
export function getMonthRange(): DateRange {
  const estParts = getESTDateParts() // Use EST for consistent date calculation

  const start = new Date(estParts.year, estParts.month - 1, 1)
  start.setHours(0, 0, 0, 0)

  // Last day of month: go to next month's day 0
  const end = new Date(estParts.year, estParts.month, 0)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    startISO: toDateInputValue(start),
    endISO: toDateInputValue(end)
  }
}

/**
 * Get the current year's date range (Jan 1 00:00:00 to Dec 31 23:59:59)
 *
 * @returns DateRange object with start and end dates for the current year
 *
 * @example
 * // If today is any day in 2025:
 * getYearRange()
 * // → { start: Jan 1, end: Dec 31, startISO: '2025-01-01', endISO: '2025-12-31' }
 */
export function getYearRange(): DateRange {
  const estParts = getESTDateParts() // Use EST for consistent date calculation
  const year = estParts.year

  const start = new Date(year, 0, 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(year, 11, 31)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    startISO: toDateInputValue(start),
    endISO: toDateInputValue(end)
  }
}

/**
 * Get date range for a specified period
 *
 * @param period - 'today' | 'week' | 'month' | 'year' | 'all'
 * @returns DateRange object for the specified period
 *         For 'all', returns a very wide range (1970 - 2099)
 */
export function getDateRangeForPeriod(period: 'today' | 'week' | 'month' | 'year' | 'all'): DateRange {
  switch (period) {
    case 'today':
      return getTodayRange()
    case 'week':
      return getWeekRange()
    case 'month':
      return getMonthRange()
    case 'year':
      return getYearRange()
    case 'all':
      // Return a very wide range for "all time"
      const allStart = new Date(1970, 0, 1)
      allStart.setHours(0, 0, 0, 0)
      const allEnd = new Date(2099, 11, 31)
      allEnd.setHours(23, 59, 59, 999)
      return {
        start: allStart,
        end: allEnd,
        startISO: '1970-01-01',
        endISO: '2099-12-31'
      }
    default:
      return getMonthRange()
  }
}

/**
 * Check if a date string falls within a date range
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param range - DateRange object to check against
 * @returns true if the date is within the range (inclusive)
 */
export function isDateInRange(dateString: string | null | undefined, range: DateRange): boolean {
  if (!dateString) return false

  try {
    const date = parseLocalDate(dateString)
    return date >= range.start && date <= range.end
  } catch {
    return false
  }
}

