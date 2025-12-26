/**
 * Payroll Calculator Service
 *
 * Handles all payroll-related calculations including:
 * - Payroll period management (Monday-Sunday, pays following Friday)
 * - Hours calculation (arrival_time → end_time + 30 minutes)
 * - Mileage calculation via Google Distance Matrix API
 * - Pay calculations for hourly and flat rate staff
 */

import { format, startOfWeek, endOfWeek, addDays, subWeeks, parseISO } from 'date-fns'

// ============================================
// TYPES
// ============================================

export interface PayrollPeriod {
  startDate: Date      // Monday
  endDate: Date        // Sunday
  payoutDate: Date     // Following Friday
  label: string        // "Jan 6 - Jan 12, 2025"
}

export interface EventPayrollDetail {
  eventId: string
  eventName: string
  eventDate: Date | string
  locationName: string

  // Pay type for THIS event
  payType: 'hourly' | 'flat_rate'

  // Hourly details (if payType = 'hourly')
  arrivalTime?: string
  endTime?: string
  hoursWorked?: number
  hourlyPay?: number

  // Mileage details (only if payType = 'hourly' AND user.mileage_enabled)
  distanceOneway?: number
  distanceRoundTrip?: number
  mileagePay?: number

  // Flat rate details (if payType = 'flat_rate')
  flatRateAmount?: number
}

export interface StaffPayrollEntry {
  userId: string
  firstName: string
  lastName: string
  userType: 'staff' | 'white_label'

  // Summary
  eventCount: number
  totalHours: number        // Sum of hourly events only
  totalMiles: number        // Sum of mileage-eligible events only
  totalFlatRateAmount: number // Sum of flat rate amounts

  // Rates (from user record)
  hourlyRate: number
  mileageRate: number
  mileageEnabled: boolean

  // Calculated Pay
  hourlyPay: number         // totalHours × hourlyRate
  mileagePay: number        // totalMiles × mileageRate
  flatRatePay: number       // Sum of flat rate events
  reimbursements: number    // From payroll_adjustments table
  totalPay: number          // hourlyPay + mileagePay + flatRatePay + reimbursements

  // Event details for drill-down modals
  events: EventPayrollDetail[]
}

export interface PayrollTotals {
  staffCount: number
  eventCount: number
  totalHours: number
  totalMiles: number
  totalHourlyPay: number
  totalMileagePay: number
  totalFlatRatePay: number
  totalReimbursements: number
  totalPay: number
}

export interface PayrollResult {
  period: PayrollPeriod
  staff: StaffPayrollEntry[]
  totals: PayrollTotals
}

// ============================================
// PAYROLL PERIOD FUNCTIONS
// ============================================

/**
 * Get payroll period dates
 * Week runs Monday-Sunday, pays out following Friday
 * @param weeksAgo - 0 = current week, 1 = last week (default), etc.
 */
export function getPayrollPeriod(weeksAgo: number = 1): PayrollPeriod {
  const now = new Date()
  const targetWeek = subWeeks(now, weeksAgo)

  // Get Monday of the target week (week starts on Monday)
  const monday = startOfWeek(targetWeek, { weekStartsOn: 1 })

  // Get Sunday of the target week
  const sunday = endOfWeek(targetWeek, { weekStartsOn: 1 })

  // Payout is the following Friday (5 days after Sunday)
  const payoutFriday = addDays(sunday, 5)

  // Format label
  const label = `${format(monday, 'MMM d')} - ${format(sunday, 'MMM d, yyyy')}`

  return {
    startDate: monday,
    endDate: sunday,
    payoutDate: payoutFriday,
    label
  }
}

/**
 * Get list of payroll periods for dropdown (last 12 weeks)
 */
export function getPayrollPeriodOptions(): PayrollPeriod[] {
  const periods: PayrollPeriod[] = []

  // Start from 1 (last week) since current week is incomplete
  for (let i = 1; i <= 12; i++) {
    periods.push(getPayrollPeriod(i))
  }

  return periods
}

// ============================================
// HOURS CALCULATION
// ============================================

/**
 * Parse time string to hours since midnight
 * @param timeStr - Time string in HH:MM or HH:MM:SS format
 */
function parseTimeToHours(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null

  const parts = timeStr.split(':')
  if (parts.length < 2) return null

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  if (isNaN(hours) || isNaN(minutes)) return null

  return hours + minutes / 60
}

/**
 * Calculate hours for a single assignment
 * Formula: arrival_time to end_time + 30 minutes
 *
 * @param arrivalTime - Staff arrival time (HH:MM format)
 * @param endTime - Event end time (HH:MM format)
 * @returns Hours worked (including 30 minute buffer), or 0 if times invalid
 */
export function calculateHours(
  arrivalTime: string | null | undefined,
  endTime: string | null | undefined
): number {
  const arrival = parseTimeToHours(arrivalTime)
  const end = parseTimeToHours(endTime)

  if (arrival === null || end === null) return 0

  // Calculate duration (handle events that span midnight)
  let duration = end - arrival
  if (duration < 0) {
    // Event ends after midnight
    duration = 24 + duration
  }

  // Add 30 minute buffer (0.5 hours)
  duration += 0.5

  // Round to 2 decimal places
  return Math.round(duration * 100) / 100
}

// ============================================
// DISTANCE CALCULATION
// ============================================

interface DistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      status: string
      distance?: { value: number } // meters
      duration?: { value: number } // seconds
    }>
  }>
  status: string
}

// Simple in-memory cache for distance calculations
const distanceCache = new Map<string, number>()

function getCacheKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string {
  // Round to 4 decimal places for cache key (about 11m precision)
  return `${originLat.toFixed(4)},${originLng.toFixed(4)}-${destLat.toFixed(4)},${destLng.toFixed(4)}`
}

/**
 * Get driving distance using Google Distance Matrix API
 * @returns One-way driving distance in miles
 */
export async function getDrivingDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<number | null> {
  // Check cache first
  const cacheKey = getCacheKey(originLat, originLng, destLat, destLng)
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('Google Maps API key not configured for distance calculation')
    return null
  }

  try {
    const origin = `${originLat},${originLng}`
    const destination = `${destLat},${destLng}`

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', origin)
    url.searchParams.set('destinations', destination)
    url.searchParams.set('mode', 'driving')
    url.searchParams.set('units', 'imperial')
    url.searchParams.set('key', apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error('Distance Matrix API error:', response.statusText)
      return null
    }

    const data: DistanceMatrixResponse = await response.json()

    if (data.status !== 'OK') {
      console.error('Distance Matrix API status:', data.status)
      return null
    }

    const element = data.rows[0]?.elements[0]

    if (element?.status !== 'OK' || !element.distance) {
      console.error('Distance Matrix element status:', element?.status)
      return null
    }

    // Convert meters to miles
    const distanceInMiles = element.distance.value / 1609.344
    const roundedDistance = Math.round(distanceInMiles * 10) / 10 // Round to 1 decimal

    // Cache the result
    distanceCache.set(cacheKey, roundedDistance)

    return roundedDistance
  } catch (error) {
    console.error('Error fetching driving distance:', error)
    return null
  }
}

// ============================================
// PAY CALCULATION HELPERS
// ============================================

/**
 * Determine the effective pay type for an assignment
 * Priority: assignment override > user default
 */
export function getEffectivePayType(
  userPayType: 'hourly' | 'flat_rate' | null,
  userType: 'staff' | 'white_label' | null,
  assignmentOverride: 'hourly' | 'flat_rate' | null
): 'hourly' | 'flat_rate' {
  // White label users are always flat rate
  if (userType === 'white_label') {
    return 'flat_rate'
  }

  // Check for assignment-level override
  if (assignmentOverride) {
    return assignmentOverride
  }

  // Default to user's pay type or hourly
  return userPayType || 'hourly'
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return hours.toFixed(1)
}

/**
 * Format distance for display
 */
export function formatMiles(miles: number): string {
  return `${miles.toFixed(1)} mi`
}
