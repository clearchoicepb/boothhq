/**
 * Backfill Coordinates Script
 *
 * Geocodes existing addresses in the database that don't have coordinates.
 * Uses Google Geocoding API with rate limiting to avoid quota issues.
 *
 * Usage:
 *   npx tsx scripts/backfill-coordinates.ts [options]
 *
 * Options:
 *   --dry-run       Show what would be updated without making changes
 *   --locations     Only process locations table
 *   --users         Only process users table
 *   --limit=N       Process only N records per table
 *   --tenant=ID     Only process records for specific tenant
 *
 * Environment Variables Required:
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY - Google Maps API key with Geocoding API enabled
 *   DEFAULT_TENANT_DATA_URL - Supabase tenant database URL
 *   DEFAULT_TENANT_DATA_SERVICE_KEY - Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Parse command line arguments
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LOCATIONS_ONLY = args.includes('--locations')
const USERS_ONLY = args.includes('--users')
const LIMIT = args.find(a => a.startsWith('--limit='))?.split('=')[1]
const TENANT_ID = args.find(a => a.startsWith('--tenant='))?.split('=')[1]

// Configuration
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const SUPABASE_URL = process.env.DEFAULT_TENANT_DATA_URL
const SUPABASE_KEY = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY

// Rate limiting: Google allows 50 requests/second, but we'll be conservative
// Using 200ms delay between requests (~5 req/sec) to avoid hitting limits
const DELAY_MS = 200

// Statistics
const stats = {
  locations: { total: 0, success: 0, failed: 0, skipped: 0 },
  users: { total: 0, success: 0, failed: 0, skipped: 0 }
}

interface GeocodingResult {
  latitude: number
  longitude: number
  place_id: string
  formatted_address: string
}

interface LocationRecord {
  id: string
  tenant_id: string
  name: string
  address_line1: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

interface UserRecord {
  id: string
  tenant_id: string
  first_name: string | null
  last_name: string | null
  address_line_1: string | null
  city: string | null
  state: string | null
  zip_code: string | null
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Build address string from components
 */
function buildAddressString(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ')
}

/**
 * Call Google Geocoding API
 */
async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!GOOGLE_API_KEY) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is required')
  }

  const encodedAddress = encodeURIComponent(address)
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        place_id: result.place_id,
        formatted_address: result.formatted_address
      }
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn(`  ⚠ No results found for address: ${address}`)
      return null
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google API quota exceeded. Please wait or check your billing.')
    } else {
      console.warn(`  ⚠ Geocoding failed with status: ${data.status}`)
      return null
    }
  } catch (error) {
    console.error(`  ✗ Geocoding error for "${address}":`, error)
    throw error
  }
}

/**
 * Process locations table
 */
async function processLocations(supabase: SupabaseClient): Promise<void> {
  console.log('\n📍 Processing LOCATIONS table...\n')

  // Query locations without coordinates
  let query = supabase
    .from('locations')
    .select('id, tenant_id, name, address_line1, city, state, postal_code, country')
    .is('latitude', null)
    .not('address_line1', 'is', null)
    .order('created_at', { ascending: true })

  if (TENANT_ID) {
    query = query.eq('tenant_id', TENANT_ID)
  }

  if (LIMIT) {
    query = query.limit(parseInt(LIMIT))
  }

  const { data: locations, error } = await query

  if (error) {
    console.error('Error fetching locations:', error)
    return
  }

  if (!locations || locations.length === 0) {
    console.log('✓ No locations need geocoding')
    return
  }

  stats.locations.total = locations.length
  console.log(`Found ${locations.length} locations to geocode\n`)

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i] as LocationRecord
    const address = buildAddressString([
      location.address_line1,
      location.city,
      location.state,
      location.postal_code,
      location.country || 'US'
    ])

    console.log(`[${i + 1}/${locations.length}] Location "${location.name}"`)
    console.log(`  Address: ${address}`)

    if (!address || address.length < 5) {
      console.log('  ⊘ Skipped: Address too short')
      stats.locations.skipped++
      continue
    }

    try {
      const result = await geocodeAddress(address)

      if (result) {
        console.log(`  → Lat: ${result.latitude}, Lng: ${result.longitude}`)
        console.log(`  → Place ID: ${result.place_id}`)

        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('locations')
            .update({
              latitude: result.latitude,
              longitude: result.longitude,
              place_id: result.place_id
            })
            .eq('id', location.id)

          if (updateError) {
            console.error(`  ✗ Update failed:`, updateError.message)
            stats.locations.failed++
          } else {
            console.log('  ✓ Updated successfully')
            stats.locations.success++
          }
        } else {
          console.log('  [DRY RUN] Would update with these coordinates')
          stats.locations.success++
        }
      } else {
        stats.locations.failed++
      }
    } catch (error) {
      stats.locations.failed++
      // Check if it's a rate limit error
      if ((error as Error).message.includes('quota')) {
        console.error('\n❌ API quota exceeded. Stopping.')
        break
      }
    }

    // Rate limiting delay
    if (i < locations.length - 1) {
      await sleep(DELAY_MS)
    }
  }
}

/**
 * Process users table
 */
async function processUsers(supabase: SupabaseClient): Promise<void> {
  console.log('\n👤 Processing USERS table...\n')

  // Query users without coordinates
  let query = supabase
    .from('users')
    .select('id, tenant_id, address_line_1, city, state, zip_code')
    .is('home_latitude', null)
    .not('address_line_1', 'is', null)
    .order('created_at', { ascending: true })

  if (TENANT_ID) {
    query = query.eq('tenant_id', TENANT_ID)
  }

  if (LIMIT) {
    query = query.limit(parseInt(LIMIT))
  }

  const { data: users, error } = await query

  if (error) {
    console.error('Error fetching users:', error)
    return
  }

  if (!users || users.length === 0) {
    console.log('✓ No users need geocoding')
    return
  }

  stats.users.total = users.length
  console.log(`Found ${users.length} users to geocode\n`)

  for (let i = 0; i < users.length; i++) {
    const user = users[i] as UserRecord
    const address = buildAddressString([
      user.address_line_1,
      user.city,
      user.state,
      user.zip_code,
      'US' // Default to US for users
    ])

    const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.id
    console.log(`[${i + 1}/${users.length}] User "${userName}"`)
    console.log(`  Address: ${address}`)

    if (!address || address.length < 5) {
      console.log('  ⊘ Skipped: Address too short')
      stats.users.skipped++
      continue
    }

    try {
      const result = await geocodeAddress(address)

      if (result) {
        console.log(`  → Lat: ${result.latitude}, Lng: ${result.longitude}`)

        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              home_latitude: result.latitude,
              home_longitude: result.longitude,
              country: 'US' // Set country if not already set
            })
            .eq('id', user.id)

          if (updateError) {
            console.error(`  ✗ Update failed:`, updateError.message)
            stats.users.failed++
          } else {
            console.log('  ✓ Updated successfully')
            stats.users.success++
          }
        } else {
          console.log('  [DRY RUN] Would update with these coordinates')
          stats.users.success++
        }
      } else {
        stats.users.failed++
      }
    } catch (error) {
      stats.users.failed++
      // Check if it's a rate limit error
      if ((error as Error).message.includes('quota')) {
        console.error('\n❌ API quota exceeded. Stopping.')
        break
      }
    }

    // Rate limiting delay
    if (i < users.length - 1) {
      await sleep(DELAY_MS)
    }
  }
}

/**
 * Print final statistics
 */
function printStats(): void {
  console.log('\n' + '='.repeat(50))
  console.log('📊 GEOCODING SUMMARY')
  console.log('='.repeat(50))

  if (!USERS_ONLY) {
    console.log('\nLocations:')
    console.log(`  Total:   ${stats.locations.total}`)
    console.log(`  Success: ${stats.locations.success}`)
    console.log(`  Failed:  ${stats.locations.failed}`)
    console.log(`  Skipped: ${stats.locations.skipped}`)
  }

  if (!LOCATIONS_ONLY) {
    console.log('\nUsers:')
    console.log(`  Total:   ${stats.users.total}`)
    console.log(`  Success: ${stats.users.success}`)
    console.log(`  Failed:  ${stats.users.failed}`)
    console.log(`  Skipped: ${stats.users.skipped}`)
  }

  const totalSuccess = stats.locations.success + stats.users.success
  const totalFailed = stats.locations.failed + stats.users.failed
  const totalProcessed = stats.locations.total + stats.users.total

  console.log('\nOverall:')
  console.log(`  Processed: ${totalProcessed}`)
  console.log(`  Success:   ${totalSuccess}`)
  console.log(`  Failed:    ${totalFailed}`)

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database')
  }

  console.log('='.repeat(50) + '\n')
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('\n' + '='.repeat(50))
  console.log('🌍 COORDINATE BACKFILL SCRIPT')
  console.log('='.repeat(50))

  // Validate environment
  if (!GOOGLE_API_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is required')
    console.error('   Set this environment variable with your Google Maps API key')
    process.exit(1)
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: DEFAULT_TENANT_DATA_URL and DEFAULT_TENANT_DATA_SERVICE_KEY are required')
    process.exit(1)
  }

  // Print configuration
  console.log('\nConfiguration:')
  console.log(`  Dry Run:        ${DRY_RUN ? 'Yes' : 'No'}`)
  console.log(`  Process:        ${LOCATIONS_ONLY ? 'Locations only' : USERS_ONLY ? 'Users only' : 'Both'}`)
  console.log(`  Limit:          ${LIMIT || 'None'}`)
  console.log(`  Tenant:         ${TENANT_ID || 'All'}`)
  console.log(`  Rate Limit:     ${1000 / DELAY_MS} req/sec`)

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Process tables
    if (!USERS_ONLY) {
      await processLocations(supabase)
    }

    if (!LOCATIONS_ONLY) {
      await processUsers(supabase)
    }

    // Print final stats
    printStats()

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
