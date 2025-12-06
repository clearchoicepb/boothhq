import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:debug')
export async function GET() {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    // Get ALL tenant settings
    const { data: allSettings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)

    // Get ALL opportunities to compare
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('id, name, stage, probability')
      .eq('tenant_id', dataSourceTenantId)
      .limit(5)

    // Parse settings for opportunities module
    const opportunitySettings = allSettings?.filter(s => s.setting_key.startsWith('opportunities.')) || []

    // Build a parsed version for easier reading
    const parsedSettings: any = {}
    opportunitySettings.forEach(s => {
      const key = s.setting_key.replace('opportunities.', '')
      parsedSettings[key] = s.setting_value
    })

    // Build stages array manually
    const stages: any[] = []
    let i = 0
    while (i < 20) {
      const stageId = parsedSettings[`stages.${i}.id`]
      if (!stageId) break
      stages.push({
        index: i,
        id: stageId,
        name: parsedSettings[`stages.${i}.name`],
        probability: parsedSettings[`stages.${i}.probability`],
        color: parsedSettings[`stages.${i}.color`],
        enabled: parsedSettings[`stages.${i}.enabled`]
      })
      i++
    }

    return NextResponse.json({
      message: '🔍 Debug Info - Probability Auto-Calculation System',
      tenantId: session.user.tenantId,

      summary: {
        totalSettings: allSettings?.length || 0,
        opportunitySettings: opportunitySettings.length,
        autoCalculateEnabled: parsedSettings.autoCalculateProbability,
        autoCalculateType: typeof parsedSettings.autoCalculateProbability,
        stagesConfigured: stages.length,
        opportunitiesSampled: opportunities?.length || 0
      },

      stages: stages,

      parsedSettings: parsedSettings,

      rawSettings: opportunitySettings,

      sampleOpportunities: opportunities,

      possibleIssues: {
        autoCalcNotBoolean: typeof parsedSettings.autoCalculateProbability !== 'boolean' && parsedSettings.autoCalculateProbability !== 'true',
        noStages: stages.length === 0,
        probabilitiesAreStrings: stages.some(s => typeof s.probability === 'string'),
        stageIdMismatch: opportunities?.some(opp => !stages.find(s => s.id === opp.stage))
      }
    }, { status: 200 })
  } catch (error) {
    log.error({ error }, 'Debug endpoint error')
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
