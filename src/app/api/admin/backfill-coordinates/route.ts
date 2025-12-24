import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, type UserRole } from '@/lib/roles'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:admin:backfill-coordinates')

// Rate limit delay between geocoding requests (ms)
const GEOCODE_DELAY_MS = 200

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface GeocodingResult {
  lat: number
  lng: number
  placeId: string
}

interface ProcessingResult {
  processed: number
  updated: number
  failed: number
  remaining: number
  failures: Array<{ id: string; name: string; error: string }>
}

/**
 * Call Google Geocoding API to get coordinates for an address
 */
async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('Google Maps API key not configured')
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  )
  const data = await response.json()

  if (data.status === 'OK' && data.results.length > 0) {
    const result = data.results[0]
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      placeId: result.place_id
    }
  }

  if (data.status === 'ZERO_RESULTS') {
    return null
  }

  throw new Error(`Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
}

/**
 * Build a full address string from components
 */
function buildAddressString(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ').trim()
}

// GET /api/admin/backfill-coordinates - Backfill coordinates for addresses
// Query params:
//   - type: 'locations' | 'users' | 'all' (default: 'all')
//   - limit: number (default: 50, max: 100)
//   - dryRun: 'true' | 'false' (default: 'false')
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Admin authentication check
    if (!isAdmin(session.user.role as UserRole)) {
      log.warn({ userId: session.user.id, role: session.user.role }, 'Non-admin attempted backfill access')
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(1, limitParam), 100) // Clamp between 1-100
    const dryRun = searchParams.get('dryRun') === 'true'

    log.info({ type, limit, dryRun, userId: session.user.id }, 'Starting coordinate backfill')

    const results: {
      locations?: ProcessingResult
      users?: ProcessingResult
    } = {}

    // Process locations
    if (type === 'all' || type === 'locations') {
      results.locations = await processLocations(supabase, dataSourceTenantId, limit, dryRun)
    }

    // Process users
    if (type === 'all' || type === 'users') {
      results.users = await processUsers(supabase, dataSourceTenantId, limit, dryRun)
    }

    // Build summary message
    const totalProcessed = (results.locations?.processed || 0) + (results.users?.processed || 0)
    const totalRemaining = (results.locations?.remaining || 0) + (results.users?.remaining || 0)

    let message = `Processed ${totalProcessed} records.`
    if (totalRemaining > 0) {
      message += ` ${totalRemaining} records remaining.`
    } else {
      message += ' All records have been geocoded.'
    }

    return NextResponse.json({
      success: true,
      dryRun,
      results,
      message
    })

  } catch (error) {
    log.error({ error }, 'Backfill coordinates error')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Process locations table - geocode addresses missing coordinates
 */
async function processLocations(
  supabase: ReturnType<typeof getTenantContext> extends Promise<infer T>
    ? T extends { supabase: infer S } ? S : never
    : never,
  tenantId: string,
  limit: number,
  dryRun: boolean
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    updated: 0,
    failed: 0,
    remaining: 0,
    failures: []
  }

  // Fetch locations needing geocoding
  const { data: locations, error: fetchError } = await supabase
    .from('locations')
    .select('id, name, address_line1, city, state, postal_code, country')
    .eq('tenant_id', tenantId)
    .is('latitude', null)
    .not('address_line1', 'is', null)
    .limit(limit)

  if (fetchError) {
    throw new Error(`Failed to fetch locations: ${fetchError.message}`)
  }

  // Count remaining
  const { count: remainingCount } = await supabase
    .from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('latitude', null)
    .not('address_line1', 'is', null)

  result.remaining = Math.max(0, (remainingCount || 0) - (locations?.length || 0))

  if (!locations || locations.length === 0) {
    return result
  }

  // Process each location
  for (const location of locations) {
    result.processed++

    const address = buildAddressString([
      location.address_line1,
      location.city,
      location.state,
      location.postal_code,
      location.country
    ])

    if (!address || address.length < 5) {
      result.failed++
      result.failures.push({
        id: location.id,
        name: location.name || 'Unnamed',
        error: 'Address too short or empty'
      })
      continue
    }

    try {
      const coords = await geocodeAddress(address)

      if (!coords) {
        result.failed++
        result.failures.push({
          id: location.id,
          name: location.name || 'Unnamed',
          error: 'No results found for address'
        })
        continue
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('locations')
          .update({
            latitude: coords.lat,
            longitude: coords.lng,
            place_id: coords.placeId
          })
          .eq('id', location.id)
          .eq('tenant_id', tenantId)

        if (updateError) {
          result.failed++
          result.failures.push({
            id: location.id,
            name: location.name || 'Unnamed',
            error: `Update failed: ${updateError.message}`
          })
          continue
        }
      }

      result.updated++

      // Rate limit between requests
      if (result.processed < locations.length) {
        await delay(GEOCODE_DELAY_MS)
      }

    } catch (error) {
      result.failed++
      result.failures.push({
        id: location.id,
        name: location.name || 'Unnamed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return result
}

/**
 * Process users table - geocode home addresses missing coordinates
 */
async function processUsers(
  supabase: ReturnType<typeof getTenantContext> extends Promise<infer T>
    ? T extends { supabase: infer S } ? S : never
    : never,
  tenantId: string,
  limit: number,
  dryRun: boolean
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    updated: 0,
    failed: 0,
    remaining: 0,
    failures: []
  }

  // Fetch users needing geocoding
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, address_line_1, city, state, zip_code')
    .eq('tenant_id', tenantId)
    .is('home_latitude', null)
    .not('address_line_1', 'is', null)
    .limit(limit)

  if (fetchError) {
    throw new Error(`Failed to fetch users: ${fetchError.message}`)
  }

  // Count remaining
  const { count: remainingCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('home_latitude', null)
    .not('address_line_1', 'is', null)

  result.remaining = Math.max(0, (remainingCount || 0) - (users?.length || 0))

  if (!users || users.length === 0) {
    return result
  }

  // Process each user
  for (const user of users) {
    result.processed++

    const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.id

    const address = buildAddressString([
      user.address_line_1,
      user.city,
      user.state,
      user.zip_code,
      'US' // Default to US for users
    ])

    if (!address || address.length < 5) {
      result.failed++
      result.failures.push({
        id: user.id,
        name: userName,
        error: 'Address too short or empty'
      })
      continue
    }

    try {
      const coords = await geocodeAddress(address)

      if (!coords) {
        result.failed++
        result.failures.push({
          id: user.id,
          name: userName,
          error: 'No results found for address'
        })
        continue
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            home_latitude: coords.lat,
            home_longitude: coords.lng
          })
          .eq('id', user.id)
          .eq('tenant_id', tenantId)

        if (updateError) {
          result.failed++
          result.failures.push({
            id: user.id,
            name: userName,
            error: `Update failed: ${updateError.message}`
          })
          continue
        }
      }

      result.updated++

      // Rate limit between requests
      if (result.processed < users.length) {
        await delay(GEOCODE_DELAY_MS)
      }

    } catch (error) {
      result.failed++
      result.failures.push({
        id: user.id,
        name: userName,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return result
}
