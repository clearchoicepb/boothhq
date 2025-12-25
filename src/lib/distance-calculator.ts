/**
 * Distance Calculation Utility
 *
 * Provides functions for calculating distances between staff home addresses
 * and event locations. Supports both Haversine (straight-line) calculations
 * and Google Distance Matrix API (driving distance) calculations.
 */

import type {
  Coordinates,
  DistanceUnit,
  DrivingDistanceResult,
  StaffToLocationDistanceResult,
  StaffWithDistance,
  GoogleDistanceMatrixResponse,
} from '@/types/distance'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:distance-calculator')

/** Earth's radius in miles */
const EARTH_RADIUS_MILES = 3959

/** Earth's radius in kilometers */
const EARTH_RADIUS_KM = 6371

/** Meters per mile */
const METERS_PER_MILE = 1609.34

/** Seconds per minute */
const SECONDS_PER_MINUTE = 60

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate straight-line distance between two points using the Haversine formula
 *
 * The Haversine formula calculates the great-circle distance between two points
 * on a sphere given their latitude and longitude coordinates.
 *
 * @param lat1 - Origin latitude
 * @param lng1 - Origin longitude
 * @param lat2 - Destination latitude
 * @param lng2 - Destination longitude
 * @param unit - 'miles' | 'kilometers' (default: 'miles')
 * @returns Distance in the specified unit, rounded to 2 decimal places
 *
 * @example
 * // Calculate distance between NYC and LA
 * const distance = calculateHaversineDistance(40.7128, -74.0060, 34.0522, -118.2437)
 * console.log(distance) // ~2451.79 miles
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: DistanceUnit = 'miles'
): number {
  // Validate inputs
  if (!isValidLatitude(lat1) || !isValidLatitude(lat2)) {
    throw new Error(`Invalid latitude. Must be between -90 and 90. Got: lat1=${lat1}, lat2=${lat2}`)
  }
  if (!isValidLongitude(lng1) || !isValidLongitude(lng2)) {
    throw new Error(`Invalid longitude. Must be between -180 and 180. Got: lng1=${lng1}, lng2=${lng2}`)
  }

  const R = unit === 'miles' ? EARTH_RADIUS_MILES : EARTH_RADIUS_KM

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = R * c

  // Round to 2 decimal places
  return Math.round(distance * 100) / 100
}

/**
 * Calculate driving distance using Google Distance Matrix API
 *
 * This function calls the Google Distance Matrix API to get actual driving
 * distance and duration between two points.
 *
 * @param origin - { lat: number, lng: number } or address string
 * @param destination - { lat: number, lng: number } or address string
 * @returns Promise with distance (miles), duration (minutes), and status
 *
 * @example
 * // Calculate driving distance using coordinates
 * const result = await calculateDrivingDistance(
 *   { lat: 40.7128, lng: -74.0060 },
 *   { lat: 40.7580, lng: -73.9855 }
 * )
 * console.log(result.distance) // 3.2 miles
 * console.log(result.duration) // 12 minutes
 *
 * @example
 * // Calculate using address strings
 * const result = await calculateDrivingDistance(
 *   "123 Main St, New York, NY",
 *   "456 Broadway, New York, NY"
 * )
 */
export async function calculateDrivingDistance(
  origin: Coordinates | string,
  destination: Coordinates | string
): Promise<DrivingDistanceResult> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    log.error('Google Maps API key not configured')
    return {
      distance: 0,
      duration: 0,
      distanceText: '',
      durationText: '',
      status: 'ERROR',
    }
  }

  // Format origin and destination for the API
  const originStr = formatLocationForApi(origin)
  const destStr = formatLocationForApi(destination)

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', originStr)
    url.searchParams.set('destinations', destStr)
    url.searchParams.set('units', 'imperial')
    url.searchParams.set('key', apiKey)

    log.debug({ origin: originStr, destination: destStr }, 'Calling Google Distance Matrix API')

    const response = await fetch(url.toString())

    if (!response.ok) {
      log.error({ status: response.status }, 'Google Distance Matrix API HTTP error')
      return {
        distance: 0,
        duration: 0,
        distanceText: '',
        durationText: '',
        status: 'ERROR',
      }
    }

    const data: GoogleDistanceMatrixResponse = await response.json()

    log.debug({ responseStatus: data.status }, 'Google Distance Matrix API response')

    if (data.status !== 'OK') {
      log.error({ status: data.status, message: data.error_message }, 'Google API error')
      return {
        distance: 0,
        duration: 0,
        distanceText: '',
        durationText: '',
        status: 'ERROR',
      }
    }

    const element = data.rows?.[0]?.elements?.[0]

    if (!element) {
      log.error('No element in Google Distance Matrix response')
      return {
        distance: 0,
        duration: 0,
        distanceText: '',
        durationText: '',
        status: 'ERROR',
      }
    }

    if (element.status === 'NOT_FOUND') {
      return {
        distance: 0,
        duration: 0,
        distanceText: '',
        durationText: '',
        status: 'NOT_FOUND',
      }
    }

    if (element.status === 'ZERO_RESULTS') {
      return {
        distance: 0,
        duration: 0,
        distanceText: '',
        durationText: '',
        status: 'ZERO_RESULTS',
      }
    }

    if (element.status !== 'OK' || !element.distance || !element.duration) {
      return {
        distance: 0,
        duration: 0,
        distanceText: '',
        durationText: '',
        status: 'ERROR',
      }
    }

    // Convert meters to miles and seconds to minutes
    const distanceMiles = element.distance.value / METERS_PER_MILE
    const durationMinutes = element.duration.value / SECONDS_PER_MINUTE

    return {
      distance: Math.round(distanceMiles * 10) / 10, // Round to 1 decimal
      duration: Math.round(durationMinutes),
      distanceText: element.distance.text,
      durationText: element.duration.text,
      status: 'OK',
    }
  } catch (error) {
    log.error({ error }, 'Error calling Google Distance Matrix API')
    return {
      distance: 0,
      duration: 0,
      distanceText: '',
      durationText: '',
      status: 'ERROR',
    }
  }
}

/**
 * Calculate distance from a staff member to an event location
 *
 * This function looks up the staff member's home coordinates and the location's
 * coordinates from the database, then calculates the distance between them.
 *
 * @param supabase - Supabase client for database queries
 * @param userId - Staff user ID
 * @param locationId - Event location ID
 * @param tenantId - Tenant ID for filtering
 * @param useGoogleApi - If true, also calculate driving distance (default: false)
 * @returns Promise with staff name, location name, and distances
 *
 * @example
 * const result = await calculateStaffToLocationDistance(
 *   supabase,
 *   'user-123',
 *   'location-456',
 *   'tenant-789',
 *   false // Use Haversine only (free)
 * )
 * console.log(result.straightLineDistance) // 23.4 miles
 *
 * @example
 * // With driving distance
 * const result = await calculateStaffToLocationDistance(
 *   supabase,
 *   'user-123',
 *   'location-456',
 *   'tenant-789',
 *   true // Also get driving distance
 * )
 * console.log(result.drivingDistance) // 28.1 miles
 * console.log(result.drivingDuration) // 32 minutes
 */
export async function calculateStaffToLocationDistance(
  supabase: any,
  userId: string,
  locationId: string,
  tenantId: string,
  useGoogleApi: boolean = false
): Promise<StaffToLocationDistanceResult> {
  // Fetch user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, first_name, last_name, home_latitude, home_longitude, address_line_1, city, state, zip_code')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (userError || !user) {
    log.error({ userId, error: userError }, 'Failed to fetch user')
    throw new Error(`User not found: ${userId}`)
  }

  // Fetch location data
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name, latitude, longitude, address_line1, city, state, postal_code')
    .eq('id', locationId)
    .eq('tenant_id', tenantId)
    .single()

  if (locationError || !location) {
    log.error({ locationId, error: locationError }, 'Failed to fetch location')
    throw new Error(`Location not found: ${locationId}`)
  }

  const staffName = `${user.first_name} ${user.last_name}`.trim()
  const locationName = location.name

  // Check if we have coordinates for both
  const userHasCoords = user.home_latitude != null && user.home_longitude != null
  const locationHasCoords = location.latitude != null && location.longitude != null

  if (!userHasCoords) {
    log.warn({ userId }, 'User does not have home coordinates')
    throw new Error(`User ${staffName} does not have home coordinates set`)
  }

  if (!locationHasCoords) {
    log.warn({ locationId }, 'Location does not have coordinates')
    throw new Error(`Location ${locationName} does not have coordinates set`)
  }

  // Calculate straight-line distance (always free)
  const straightLineDistance = calculateHaversineDistance(
    user.home_latitude,
    user.home_longitude,
    location.latitude,
    location.longitude,
    'miles'
  )

  const result: StaffToLocationDistanceResult = {
    staffName,
    locationName,
    straightLineDistance,
  }

  // Optionally calculate driving distance
  if (useGoogleApi) {
    const drivingResult = await calculateDrivingDistance(
      { lat: user.home_latitude, lng: user.home_longitude },
      { lat: location.latitude, lng: location.longitude }
    )

    if (drivingResult.status === 'OK') {
      result.drivingDistance = drivingResult.distance
      result.drivingDuration = drivingResult.duration
    } else {
      log.warn({ status: drivingResult.status }, 'Failed to get driving distance')
    }
  }

  return result
}

/**
 * Find staff members within a certain radius of a location
 *
 * Uses Haversine formula for speed (no API calls needed).
 * Returns staff sorted by distance (nearest first).
 *
 * @param supabase - Supabase client for database queries
 * @param locationId - Event location ID
 * @param radiusMiles - Maximum distance in miles
 * @param tenantId - Tenant ID for filtering
 * @returns Promise with array of staff within radius, sorted by distance
 *
 * @example
 * const nearbyStaff = await findStaffWithinRadius(
 *   supabase,
 *   'location-123',
 *   30, // 30 mile radius
 *   'tenant-456'
 * )
 * console.log(nearbyStaff)
 * // [
 * //   { userId: 'u1', firstName: 'John', lastName: 'Doe', distanceMiles: 5.2 },
 * //   { userId: 'u2', firstName: 'Jane', lastName: 'Smith', distanceMiles: 12.8 },
 * // ]
 */
export async function findStaffWithinRadius(
  supabase: any,
  locationId: string,
  radiusMiles: number,
  tenantId: string
): Promise<StaffWithDistance[]> {
  // Fetch location coordinates
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name, latitude, longitude')
    .eq('id', locationId)
    .eq('tenant_id', tenantId)
    .single()

  if (locationError || !location) {
    log.error({ locationId, error: locationError }, 'Failed to fetch location')
    throw new Error(`Location not found: ${locationId}`)
  }

  if (location.latitude == null || location.longitude == null) {
    throw new Error(`Location ${location.name} does not have coordinates set`)
  }

  // Fetch all active staff with home coordinates
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, home_latitude, home_longitude')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('home_latitude', 'is', null)
    .not('home_longitude', 'is', null)

  if (usersError) {
    log.error({ error: usersError }, 'Failed to fetch users')
    throw new Error('Failed to fetch staff members')
  }

  if (!users || users.length === 0) {
    return []
  }

  // Calculate distances and filter by radius
  const staffWithDistance: StaffWithDistance[] = []

  for (const user of users) {
    if (user.home_latitude == null || user.home_longitude == null) {
      continue
    }

    const distance = calculateHaversineDistance(
      user.home_latitude,
      user.home_longitude,
      location.latitude,
      location.longitude,
      'miles'
    )

    if (distance <= radiusMiles) {
      staffWithDistance.push({
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        distanceMiles: distance,
      })
    }
  }

  // Sort by distance (nearest first)
  staffWithDistance.sort((a, b) => a.distanceMiles - b.distanceMiles)

  log.debug(
    { locationId, radiusMiles, totalUsers: users.length, matchingStaff: staffWithDistance.length },
    'Found staff within radius'
  )

  return staffWithDistance
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate if a value is a valid latitude (-90 to 90)
 */
function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
}

/**
 * Validate if a value is a valid longitude (-180 to 180)
 */
function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180
}

/**
 * Format a location (coordinates or address string) for the Google API
 */
function formatLocationForApi(location: Coordinates | string): string {
  if (typeof location === 'string') {
    return encodeURIComponent(location)
  }
  return `${location.lat},${location.lng}`
}
