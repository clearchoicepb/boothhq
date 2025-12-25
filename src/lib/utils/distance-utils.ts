/**
 * Client-side Distance Calculation Utilities
 *
 * Lightweight utilities for calculating distances in the browser.
 * Uses Haversine formula for straight-line distance calculations.
 */

/** Earth's radius in miles */
const EARTH_RADIUS_MILES = 3959

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate straight-line distance between two points using the Haversine formula
 *
 * @param lat1 - Origin latitude
 * @param lng1 - Origin longitude
 * @param lat2 - Destination latitude
 * @param lng2 - Destination longitude
 * @returns Distance in miles, rounded to 1 decimal place
 *
 * @example
 * const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437)
 * console.log(distance) // ~2451.8 miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = EARTH_RADIUS_MILES * c

  // Round to 1 decimal place
  return Math.round(distance * 10) / 10
}

/**
 * Format distance for display
 *
 * @param distance - Distance in miles (can be null/undefined)
 * @returns Formatted string like "12.3 mi" or "Unknown"
 */
export function formatDistance(distance: number | null | undefined): string {
  if (distance == null) {
    return 'Unknown'
  }
  return `${distance} mi`
}

/**
 * Get distance color class based on thresholds
 *
 * @param distance - Distance in miles
 * @returns Tailwind color class
 */
export function getDistanceColorClass(distance: number | null | undefined): string {
  if (distance == null) {
    return 'text-gray-400'
  }
  if (distance < 15) {
    return 'text-green-600'
  }
  if (distance <= 30) {
    return 'text-yellow-600'
  }
  return 'text-red-600'
}

/**
 * Coordinates type for locations
 */
export interface Coordinates {
  latitude: number | null
  longitude: number | null
}

/**
 * User with distance information
 */
export interface UserWithDistance {
  id: string
  first_name: string
  last_name: string
  email?: string
  home_latitude?: number | null
  home_longitude?: number | null
  distance?: number | null
  hasCoordinates: boolean
}

/**
 * Calculate distances for an array of users from a location
 *
 * @param users - Array of users with home coordinates
 * @param location - Location with coordinates
 * @returns Users enriched with distance data, sorted by distance
 */
export function calculateUserDistances<T extends {
  id: string
  first_name: string
  last_name: string
  home_latitude?: number | null
  home_longitude?: number | null
}>(
  users: T[],
  location: Coordinates | null | undefined
): (T & { distance: number | null; hasCoordinates: boolean })[] {
  const locationHasCoords = location?.latitude != null && location?.longitude != null

  return users.map(user => {
    const userHasCoords = user.home_latitude != null && user.home_longitude != null

    let distance: number | null = null

    if (locationHasCoords && userHasCoords) {
      distance = calculateDistance(
        user.home_latitude!,
        user.home_longitude!,
        location!.latitude!,
        location!.longitude!
      )
    }

    return {
      ...user,
      distance,
      hasCoordinates: userHasCoords,
    }
  })
}

/**
 * Sort users by distance (nearest first)
 * Users without coordinates are placed at the end
 */
export function sortUsersByDistance<T extends { distance: number | null }>(
  users: T[]
): T[] {
  return [...users].sort((a, b) => {
    // Both have distance - sort by distance
    if (a.distance != null && b.distance != null) {
      return a.distance - b.distance
    }
    // Only a has distance - a comes first
    if (a.distance != null) {
      return -1
    }
    // Only b has distance - b comes first
    if (b.distance != null) {
      return 1
    }
    // Neither has distance - maintain order
    return 0
  })
}

/**
 * Filter users by maximum distance
 *
 * @param users - Users with distance data
 * @param maxDistance - Maximum distance in miles (null = no filter)
 * @returns Filtered users
 */
export function filterUsersByDistance<T extends { distance: number | null }>(
  users: T[],
  maxDistance: number | null
): T[] {
  if (maxDistance == null) {
    return users
  }

  return users.filter(user => {
    // Include users without distance (can't determine if they're within range)
    if (user.distance == null) {
      return true
    }
    return user.distance <= maxDistance
  })
}
