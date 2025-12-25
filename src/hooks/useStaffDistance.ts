'use client'

import { useMemo, useState } from 'react'
import {
  calculateUserDistances,
  sortUsersByDistance,
  filterUsersByDistance,
  type Coordinates,
} from '@/lib/utils/distance-utils'

/**
 * Distance filter options (in miles)
 */
export const DISTANCE_FILTER_OPTIONS = [
  { value: null, label: 'All Distances' },
  { value: 10, label: 'Within 10 mi' },
  { value: 25, label: 'Within 25 mi' },
  { value: 50, label: 'Within 50 mi' },
  { value: 100, label: 'Within 100 mi' },
] as const

export type DistanceFilterValue = typeof DISTANCE_FILTER_OPTIONS[number]['value']

/**
 * Sort options for staff
 */
export type StaffSortOption = 'name' | 'distance'

export interface UseStaffDistanceOptions {
  /** Location coordinates for distance calculation */
  location?: Coordinates | null
  /** Initial max distance filter */
  initialMaxDistance?: DistanceFilterValue
  /** Initial sort option */
  initialSortBy?: StaffSortOption
}

export interface UseStaffDistanceReturn<T> {
  /** Users enriched with distance data */
  usersWithDistance: (T & { distance: number | null; hasCoordinates: boolean })[]
  /** Filtered and sorted users ready for display */
  displayUsers: (T & { distance: number | null; hasCoordinates: boolean })[]
  /** Whether the location has valid coordinates */
  locationHasCoordinates: boolean
  /** Current max distance filter */
  maxDistance: DistanceFilterValue
  /** Set max distance filter */
  setMaxDistance: (value: DistanceFilterValue) => void
  /** Current sort option */
  sortBy: StaffSortOption
  /** Set sort option */
  setSortBy: (value: StaffSortOption) => void
}

/**
 * Hook for calculating and managing staff distances from a location
 *
 * @param users - Array of users with potential home coordinates
 * @param options - Configuration options
 * @returns Users with distance data, filtering, and sorting
 *
 * @example
 * ```tsx
 * const { displayUsers, locationHasCoordinates, maxDistance, setMaxDistance } = useStaffDistance(
 *   users,
 *   { location: { latitude: 40.7128, longitude: -74.0060 } }
 * )
 *
 * // Render users with distance
 * displayUsers.map(user => (
 *   <div key={user.id}>
 *     {user.first_name} {user.last_name}
 *     {user.distance != null && <span>({user.distance} mi)</span>}
 *   </div>
 * ))
 * ```
 */
export function useStaffDistance<T extends {
  id: string
  first_name: string
  last_name: string
  home_latitude?: number | null
  home_longitude?: number | null
}>(
  users: T[],
  options: UseStaffDistanceOptions = {}
): UseStaffDistanceReturn<T> {
  const {
    location,
    initialMaxDistance = null,
    initialSortBy = 'name',
  } = options

  // State for filtering and sorting
  const [maxDistance, setMaxDistance] = useState<DistanceFilterValue>(initialMaxDistance)
  const [sortBy, setSortBy] = useState<StaffSortOption>(initialSortBy)

  // Check if location has coordinates
  const locationHasCoordinates = useMemo(
    () => location?.latitude != null && location?.longitude != null,
    [location]
  )

  // Calculate distances for all users
  const usersWithDistance = useMemo(
    () => calculateUserDistances(users, location),
    [users, location]
  )

  // Apply filtering and sorting
  const displayUsers = useMemo(() => {
    let result = usersWithDistance

    // Apply distance filter
    if (maxDistance != null && locationHasCoordinates) {
      result = filterUsersByDistance(result, maxDistance)
    }

    // Apply sorting
    if (sortBy === 'distance' && locationHasCoordinates) {
      result = sortUsersByDistance(result)
    } else {
      // Sort by name
      result = [...result].sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }

    return result
  }, [usersWithDistance, maxDistance, sortBy, locationHasCoordinates])

  return {
    usersWithDistance,
    displayUsers,
    locationHasCoordinates,
    maxDistance,
    setMaxDistance,
    sortBy,
    setSortBy,
  }
}
