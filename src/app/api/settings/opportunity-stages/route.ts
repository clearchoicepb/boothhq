import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/supabase-tenant-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/settings/opportunity-stages
 * Returns the list of enabled opportunity stages from tenant settings
 * Used by the opportunities form to populate the stage dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, dataSourceTenantId } = await getTenantContext(request)

    if (!dataSourceTenantId) {
      return NextResponse.json(
        { error: 'Tenant context not found' },
        { status: 400 }
      )
    }

    // Fetch all opportunity-related settings from tenant_settings table
    const { data: settingsRows, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', dataSourceTenantId)
      .like('setting_key', 'opportunities.stages%')

    if (error) {
      console.error('[opportunity-stages] Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch opportunity stages' },
        { status: 500 }
      )
    }

    // Reconstruct the stages array from key-value pairs
    // Example keys:
    // - opportunities.stages.0.id
    // - opportunities.stages.0.name
    // - opportunities.stages.0.probability
    // - opportunities.stages.1.id
    // ...
    const stagesMap = new Map<number, any>()

    if (settingsRows && settingsRows.length > 0) {
      settingsRows.forEach((row) => {
        const match = row.setting_key.match(/opportunities\.stages\.(\d+)\.(.+)/)
        if (match) {
          const index = parseInt(match[1], 10)
          const field = match[2]

          if (!stagesMap.has(index)) {
            stagesMap.set(index, {})
          }

          const stage = stagesMap.get(index)!
          
          // Parse value based on field type
          if (field === 'probability') {
            stage[field] = parseInt(row.setting_value, 10)
          } else if (field === 'enabled') {
            stage[field] = row.setting_value === 'true'
          } else {
            stage[field] = row.setting_value
          }
        }
      })
    }

    // Convert map to array and sort by index
    let stages = Array.from(stagesMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map((entry) => entry[1])

    // Filter to only enabled stages
    stages = stages.filter((stage) => stage.enabled !== false)

    // If no stages configured in settings, return default stages
    if (stages.length === 0) {
      console.log('[opportunity-stages] No stages in settings, using defaults')
      stages = [
        { id: 'prospecting', name: 'Prospecting', probability: 10, color: 'blue', enabled: true },
        { id: 'qualification', name: 'Qualification', probability: 25, color: 'yellow', enabled: true },
        { id: 'proposal', name: 'Proposal', probability: 50, color: 'purple', enabled: true },
        { id: 'negotiation', name: 'Negotiation', probability: 75, color: 'orange', enabled: true },
        { id: 'closed_won', name: 'Closed Won', probability: 100, color: 'green', enabled: true },
        { id: 'closed_lost', name: 'Closed Lost', probability: 0, color: 'red', enabled: true }
      ]
    }

    console.log(`[opportunity-stages] Returning ${stages.length} stages for tenant ${dataSourceTenantId}`)

    // Return array directly (consistent with /api/event-types pattern)
    return NextResponse.json(stages)
  } catch (error) {
    console.error('[opportunity-stages] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

