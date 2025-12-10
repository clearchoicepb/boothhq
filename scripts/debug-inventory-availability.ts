/**
 * Debug script to check inventory availability
 * Usage: npx tsx scripts/debug-inventory-availability.ts <event_id>
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '../.env.local')
dotenv.config({ path: envPath })

async function debugInventory(eventId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('\n=== INVENTORY AVAILABILITY DEBUG ===\n')

  // Get event details
  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .single()

  console.log(`Event: ${event?.title || 'Not Found'} (${eventId})\n`)

  // Get event staff
  const { data: eventStaff } = await supabase
    .from('event_staff_assignments')
    .select('user_id, users(first_name, last_name)')
    .eq('event_id', eventId)

  console.log(`Event Staff (${eventStaff?.length || 0}):`)
  eventStaff?.forEach((s: any) => {
    console.log(`  - ${s.users?.first_name} ${s.users?.last_name}`)
  })

  // Get all inventory items
  const { data: allItems } = await supabase
    .from('inventory_items')
    .select('id, item_name, item_category, assigned_to_type, assigned_to_id, assignment_type, event_id')
    .is('event_id', null)
    .limit(50)

  console.log(`\n\nAll Available Items (not assigned to events): ${allItems?.length || 0}`)

  // Group by assignment type
  const byAssignmentType: Record<string, any[]> = {}
  allItems?.forEach((item: any) => {
    const key = `${item.assigned_to_type || 'unassigned'}:${item.assignment_type || 'none'}`
    if (!byAssignmentType[key]) byAssignmentType[key] = []
    byAssignmentType[key].push(item)
  })

  console.log('\nGrouped by assignment:')
  Object.entries(byAssignmentType).forEach(([key, items]) => {
    console.log(`  ${key}: ${items.length} items`)
    items.slice(0, 3).forEach((item: any) => {
      console.log(`    - ${item.item_name} (${item.item_category})`)
    })
  })

  // Get physical addresses
  const { data: locations } = await supabase
    .from('physical_addresses')
    .select('id, location_name')

  console.log(`\n\nPhysical Addresses: ${locations?.length || 0}`)
  locations?.forEach((loc: any) => {
    const itemsHere = allItems?.filter((i: any) => i.assigned_to_id === loc.id)
    console.log(`  - ${loc.location_name}: ${itemsHere?.length || 0} items`)
  })

  console.log('\n=== END DEBUG ===\n')
}

const eventId = process.argv[2]
if (!eventId) {
  console.error('Usage: npx tsx scripts/debug-inventory-availability.ts <event_id>')
  process.exit(1)
}

debugInventory(eventId).then(() => process.exit(0))
