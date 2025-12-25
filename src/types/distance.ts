/**
 * Distance Calculation Types
 * Types for distance calculations between staff and event locations
 */

/**
 * Coordinates representing a geographic point
 */
export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Unit of distance measurement
 */
export type DistanceUnit = 'miles' | 'kilometers'

/**
 * Google Distance Matrix API status codes
 */
export type DistanceMatrixStatus = 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'ERROR'

/**
 * Result from Google Distance Matrix API calculation
 */
export interface DrivingDistanceResult {
  /** Distance in miles */
  distance: number
  /** Duration in minutes */
  duration: number
  /** Human-readable distance (e.g., "23.4 mi") */
  distanceText: string
  /** Human-readable duration (e.g., "32 mins") */
  durationText: string
  /** Status of the calculation */
  status: DistanceMatrixStatus
}

/**
 * Result from staff-to-location distance calculation
 */
export interface StaffToLocationDistanceResult {
  staffName: string
  locationName: string
  /** Straight-line distance in miles (always calculated, free) */
  straightLineDistance: number
  /** Driving distance in miles (only if useGoogleApi is true) */
  drivingDistance?: number
  /** Driving duration in minutes (only if useGoogleApi is true) */
  drivingDuration?: number
}

/**
 * Staff member with distance information
 */
export interface StaffWithDistance {
  userId: string
  firstName: string
  lastName: string
  distanceMiles: number
}

/**
 * API response for distance calculations
 */
export interface DistanceApiResponse {
  straightLineDistance: number
  straightLineUnit: DistanceUnit
  drivingDistance?: number
  drivingDuration?: number
  drivingDistanceText?: string
  drivingDurationText?: string
  error?: string
}

/**
 * Google Distance Matrix API element response
 */
export interface GoogleDistanceMatrixElement {
  status: string
  distance?: {
    text: string
    value: number // meters
  }
  duration?: {
    text: string
    value: number // seconds
  }
}

/**
 * Google Distance Matrix API response
 */
export interface GoogleDistanceMatrixResponse {
  status: string
  origin_addresses?: string[]
  destination_addresses?: string[]
  rows?: Array<{
    elements: GoogleDistanceMatrixElement[]
  }>
  error_message?: string
}
