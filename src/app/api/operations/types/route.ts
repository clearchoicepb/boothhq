/**
 * Operations Types API Routes
 *
 * GET  - Fetch all operations types for tenant (seeds defaults if none exist)
 * POST - Create new operations type
 *
 * Follows the same pattern as /api/design/types for consistency.
 * Uses tenant-helpers for proper multi-tenant database isolation.
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:operations')

/**
 * Default operations types to seed for new tenants
 * These mirror common photo booth operations workflows
 */
const DEFAULT_OPERATIONS_TYPES = [
  // Equipment category
  {
    name: 'Equipment Check',
    description: 'Verify all equipment is ready and functional',
    category: 'equipment',
    due_date_days: 3,
    urgent_threshold_days: 2,
    missed_deadline_days: 1,
    is_auto_added: true,
    display_order: 1
  },
  {
    name: 'Equipment Transport',
    description: 'Arrange equipment transport to venue',
    category: 'logistics',
    due_date_days: 2,
    urgent_threshold_days: 1,
    missed_deadline_days: 0,
    is_auto_added: false,
    display_order: 2
  },
  // Staffing category
  {
    name: 'Staff Assignment',
    description: 'Assign staff members to event',
    category: 'staffing',
    due_date_days: 14,
    urgent_threshold_days: 7,
    missed_deadline_days: 3,
    is_auto_added: true,
    display_order: 3
  },
  {
    name: 'Staff Notification',
    description: 'Send event details to assigned staff',
    category: 'staffing',
    due_date_days: 3,
    urgent_threshold_days: 2,
    missed_deadline_days: 1,
    is_auto_added: true,
    display_order: 4
  },
  // Logistics category
  {
    name: 'Logistics Planning',
    description: 'Plan event logistics and timeline',
    category: 'logistics',
    due_date_days: 14,
    urgent_threshold_days: 7,
    missed_deadline_days: 3,
    is_auto_added: true,
    display_order: 5
  },
  {
    name: 'Vendor Coordination',
    description: 'Coordinate with external vendors',
    category: 'logistics',
    due_date_days: 7,
    urgent_threshold_days: 3,
    missed_deadline_days: 1,
    is_auto_added: false,
    display_order: 6
  },
  // Venue category
  {
    name: 'Venue Confirmation',
    description: 'Confirm venue details and access',
    category: 'venue',
    due_date_days: 7,
    urgent_threshold_days: 3,
    missed_deadline_days: 1,
    is_auto_added: true,
    display_order: 7
  },
  {
    name: 'Load-In Planning',
    description: 'Plan load-in time and logistics',
    category: 'venue',
    due_date_days: 3,
    urgent_threshold_days: 2,
    missed_deadline_days: 1,
    is_auto_added: false,
    display_order: 8
  },
  // Setup category
  {
    name: 'Booth Setup',
    description: 'Set up booth and equipment on-site',
    category: 'setup',
    due_date_days: 1,
    urgent_threshold_days: 0,
    missed_deadline_days: 0,
    is_auto_added: true,
    display_order: 9
  },
  {
    name: 'Software Configuration',
    description: 'Configure event software and settings',
    category: 'setup',
    due_date_days: 2,
    urgent_threshold_days: 1,
    missed_deadline_days: 0,
    is_auto_added: false,
    display_order: 10
  }
]

/**
 * Seed default operations types for a tenant
 * Only seeds if no types exist yet
 */
async function seedDefaultTypesIfNeeded(
  supabase: any,
  dataSourceTenantId: string
): Promise<void> {
  log.debug({ dataSourceTenantId }, 'seedDefaultTypesIfNeeded called with tenantId')

  // Check if tenant already has operations types
  const { count, error: countError } = await supabase
    .from('operations_item_types')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', dataSourceTenantId)

  log.debug({ count, countError }, 'Count check result')

  if (countError) {
    console.error('[Operations DEBUG] Error checking count - table may not exist:', {
      message: countError.message,
      code: countError.code,
      details: countError.details,
      hint: countError.hint
    })
    // Table might not exist - try to seed anyway
  }

  if (count && count > 0) {
    log.debug({ count }, 'Tenant already has types, skipping seed')
    return
  }

  log.debug({ dataSourceTenantId }, 'Seeding default types for tenant')

  // Insert all default types
  const typesToInsert = DEFAULT_OPERATIONS_TYPES.map(type => ({
    ...type,
    tenant_id: dataSourceTenantId,
    is_active: true
  }))

  log.debug({ count: typesToInsert.length }, 'Attempting to insert default types')
  log.debug({ type: typesToInsert[0] }, 'First type to insert')

  const { data: insertedData, error } = await supabase
    .from('operations_item_types')
    .insert(typesToInsert)
    .select()

  if (error) {
    console.error('[Operations DEBUG] Error seeding default types:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: JSON.stringify(error, null, 2)
    })
    // Don't throw - let the request continue even if seeding fails
  } else {
    log.debug({ count: typesToInsert.length }, 'Successfully seeded default types')
    log.debug({ count: insertedData?.length }, 'Inserted data count')
  }
}

// GET - Fetch all operations types for tenant
export async function GET() {
  log.debug({}, 'GET /api/operations/types called')

  const context = await getTenantContext()
  if (context instanceof NextResponse) {
    log.debug({}, 'getTenantContext returned error response')
    return context
  }

  const { supabase, dataSourceTenantId, tenantId } = context
  log.debug({
    tenantId,
    dataSourceTenantId,
    supabaseExists: !!supabase
  }, 'Tenant context')

  try {
    // Seed default types if this is first access
    await seedDefaultTypesIfNeeded(supabase, dataSourceTenantId)

    log.debug({}, 'Fetching all types for tenant')

    // Fetch all types for tenant
    const { data, error } = await supabase
      .from('operations_item_types' as any)
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('display_order')

    log.debug({
      dataCount: data?.length,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null
    }, 'Fetch result')

    if (error) throw error

    log.debug({ count: data?.length || 0 }, 'Returning types')
    return NextResponse.json({ types: data || [] })
  } catch (error: any) {
    console.error('[Operations DEBUG] GET Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new operations type
export async function POST(request: Request) {
  log.debug({}, 'POST /api/operations/types called')

  const context = await getTenantContext()
  if (context instanceof NextResponse) {
    log.debug({}, 'getTenantContext returned error response')
    return context
  }

  const { supabase, dataSourceTenantId, tenantId } = context
  log.debug({
    tenantId,
    dataSourceTenantId,
    supabaseExists: !!supabase
  }, 'POST Tenant context')

  try {
    const body = await request.json()
    log.debug({ body }, 'POST body received')

    const insertData = {
      name: body.name,
      description: body.description || null,
      category: body.category || 'other',
      due_date_days: body.due_date_days ?? 7,
      urgent_threshold_days: body.urgent_threshold_days ?? 3,
      missed_deadline_days: body.missed_deadline_days ?? 1,
      is_auto_added: body.is_auto_added ?? false,
      is_active: body.is_active ?? true,
      display_order: body.display_order ?? 0,
      tenant_id: dataSourceTenantId
    }
    log.debug({ insertData }, 'Insert data prepared')

    // Use direct supabase insert (matches design API pattern)
    const { data, error } = await supabase
      .from('operations_item_types' as any)
      .insert(insertData)
      .select()
      .single()

    log.debug({
      dataExists: !!data,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null
    }, 'POST result')

    if (error) throw error

    log.debug({ id: data?.id }, 'Successfully created type')
    return NextResponse.json({ type: data })
  } catch (error: any) {
    console.error('[Operations DEBUG] POST Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
