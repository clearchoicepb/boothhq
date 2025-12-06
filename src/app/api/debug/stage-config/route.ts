import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:debug')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    // Get opportunities settings from tenant_settings
    const { data: settingsData, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', dataSourceTenantId)
      .like('setting_key', 'opportunities.%')

    if (error) {
      log.error({ error }, 'Error fetching settings')
      return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 })
    }

    // Transform settings array to object
    const settings = settingsData?.reduce((acc, s) => {
      const key = s.setting_key.replace('opportunities.', '')
      acc[key] = s.setting_value
      return acc
    }, {} as any) || {}

    // Get all opportunities with their stages
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('id, name, stage')
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (oppError) {
      log.error({ oppError }, 'Error fetching opportunities')
      return NextResponse.json({ error: 'Failed to fetch opportunities', details: oppError.message }, { status: 500 })
    }

    // Count opportunities by stage
    const stageCounts = opportunities?.reduce((acc, opp) => {
      const stage = opp.stage || 'null'
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get unique stages in use
    const stagesInUse = [...new Set(opportunities?.map(o => o.stage).filter(Boolean))]

    // Get configured stages from settings
    const configuredStages = settings.stages || []
    const configuredStageIds = configuredStages.map((s: any) => s.id)

    // Find orphaned stages (in use but not configured)
    const orphanedStages = stagesInUse.filter(s => !configuredStageIds.includes(s))

    return NextResponse.json({
      tenant_id: dataSourceTenantId,
      totalOpportunities: opportunities?.length || 0,
      settings: {
        autoCalculateProbability: settings.autoCalculateProbability,
        defaultView: settings.defaultView,
        stages: configuredStages
      },
      configuredStageIds,
      stagesInUse,
      stageCounts,
      orphanedStages: orphanedStages.length > 0 ? {
        count: orphanedStages.length,
        stages: orphanedStages,
        opportunities: opportunities?.filter(o => orphanedStages.includes(o.stage)).map(o => ({
          id: o.id,
          name: o.name,
          stage: o.stage
        }))
      } : null
    })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
