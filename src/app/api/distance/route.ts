/**
 * Distance Calculation API
 *
 * Calculate distances between two points or between a staff member and location.
 *
 * GET /api/distance
 *
 * Query parameters:
 *   - userId + locationId: Calculate staff-to-location distance
 *   - OR originLat + originLng + destLat + destLng: Calculate between coordinates
 *   - driving=true: Also calculate driving distance via Google Distance Matrix API (optional)
 *   - radius + locationId: Find staff within radius miles of location
 *
 * Response:
 * {
 *   "straightLineDistance": 23.4,
 *   "straightLineUnit": "miles",
 *   "drivingDistance": 28.1,      // only if driving=true
 *   "drivingDuration": 32,        // minutes, only if driving=true
 *   "drivingDistanceText": "28.1 mi",
 *   "drivingDurationText": "32 mins"
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import {
  calculateHaversineDistance,
  calculateDrivingDistance,
  calculateStaffToLocationDistance,
  findStaffWithinRadius,
} from '@/lib/distance-calculator'
import type { DistanceApiResponse } from '@/types/distance'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:distance')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const userId = searchParams.get('userId')
    const locationId = searchParams.get('locationId')
    const originLat = searchParams.get('originLat')
    const originLng = searchParams.get('originLng')
    const destLat = searchParams.get('destLat')
    const destLng = searchParams.get('destLng')
    const driving = searchParams.get('driving') === 'true'
    const radius = searchParams.get('radius')

    // Mode 1: Find staff within radius of a location
    if (radius && locationId) {
      const radiusMiles = parseFloat(radius)

      if (isNaN(radiusMiles) || radiusMiles <= 0) {
        return NextResponse.json(
          { error: 'Invalid radius. Must be a positive number.' },
          { status: 400 }
        )
      }

      try {
        const staffWithinRadius = await findStaffWithinRadius(
          supabase,
          locationId,
          radiusMiles,
          dataSourceTenantId
        )

        return NextResponse.json({
          locationId,
          radiusMiles,
          staffCount: staffWithinRadius.length,
          staff: staffWithinRadius,
        })
      } catch (error: any) {
        log.error({ error }, 'Error finding staff within radius')
        return NextResponse.json(
          { error: error.message || 'Failed to find staff within radius' },
          { status: 400 }
        )
      }
    }

    // Mode 2: Calculate staff-to-location distance
    if (userId && locationId) {
      try {
        const result = await calculateStaffToLocationDistance(
          supabase,
          userId,
          locationId,
          dataSourceTenantId,
          driving
        )

        const response: DistanceApiResponse & {
          staffName?: string
          locationName?: string
        } = {
          staffName: result.staffName,
          locationName: result.locationName,
          straightLineDistance: result.straightLineDistance,
          straightLineUnit: 'miles',
        }

        if (driving && result.drivingDistance != null) {
          response.drivingDistance = result.drivingDistance
          response.drivingDuration = result.drivingDuration
          response.drivingDistanceText = `${result.drivingDistance} mi`
          response.drivingDurationText = `${result.drivingDuration} mins`
        }

        return NextResponse.json(response)
      } catch (error: any) {
        log.error({ error, userId, locationId }, 'Error calculating staff-to-location distance')
        return NextResponse.json(
          { error: error.message || 'Failed to calculate distance' },
          { status: 400 }
        )
      }
    }

    // Mode 3: Calculate distance between raw coordinates
    if (originLat && originLng && destLat && destLng) {
      const lat1 = parseFloat(originLat)
      const lng1 = parseFloat(originLng)
      const lat2 = parseFloat(destLat)
      const lng2 = parseFloat(destLng)

      // Validate coordinates
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        return NextResponse.json(
          { error: 'Invalid coordinates. All values must be valid numbers.' },
          { status: 400 }
        )
      }

      if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
        return NextResponse.json(
          { error: 'Invalid latitude. Must be between -90 and 90.' },
          { status: 400 }
        )
      }

      if (lng1 < -180 || lng1 > 180 || lng2 < -180 || lng2 > 180) {
        return NextResponse.json(
          { error: 'Invalid longitude. Must be between -180 and 180.' },
          { status: 400 }
        )
      }

      // Calculate straight-line distance (always free)
      const straightLineDistance = calculateHaversineDistance(lat1, lng1, lat2, lng2, 'miles')

      const response: DistanceApiResponse = {
        straightLineDistance,
        straightLineUnit: 'miles',
      }

      // Optionally calculate driving distance
      if (driving) {
        const drivingResult = await calculateDrivingDistance(
          { lat: lat1, lng: lng1 },
          { lat: lat2, lng: lng2 }
        )

        if (drivingResult.status === 'OK') {
          response.drivingDistance = drivingResult.distance
          response.drivingDuration = drivingResult.duration
          response.drivingDistanceText = drivingResult.distanceText
          response.drivingDurationText = drivingResult.durationText
        } else {
          response.error = `Driving distance unavailable: ${drivingResult.status}`
        }
      }

      return NextResponse.json(response)
    }

    // No valid parameters provided
    return NextResponse.json(
      {
        error: 'Invalid parameters',
        message:
          'Provide either: (userId + locationId), (originLat + originLng + destLat + destLng), or (radius + locationId)',
        examples: [
          '/api/distance?userId=xxx&locationId=xxx',
          '/api/distance?userId=xxx&locationId=xxx&driving=true',
          '/api/distance?originLat=40.7128&originLng=-74.006&destLat=34.0522&destLng=-118.2437',
          '/api/distance?radius=30&locationId=xxx',
        ],
      },
      { status: 400 }
    )
  } catch (error: any) {
    log.error({ error }, 'Unexpected error in distance API')
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
