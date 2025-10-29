import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Get settings to check if auto-calculate is enabled
    const { data: settingsData } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', session.user.tenantId)
      .like('setting_key', 'opportunities.%')

    if (!settingsData || settingsData.length === 0) {
      return NextResponse.json({
        message: 'No opportunity settings found'
      })
    }

    const settings = settingsData.reduce((acc, s) => {
      const key = s.setting_key.replace('opportunities.', '')
      acc[key] = s.setting_value
      return acc
    }, {} as any)

    if (!settings.autoCalculateProbability) {
      return NextResponse.json({
        message: 'Auto-calculate not enabled'
      })
    }

    // Get stages array - it's already an array in the settings!
    const stages = settings.stages || []

    if (stages.length === 0) {
      return NextResponse.json({
        message: 'No stages configured'
      })
    }

    // Get all opportunities for this tenant
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('id, stage')
      .eq('tenant_id', session.user.tenantId)

    if (oppError) {
      console.error('Error fetching opportunities:', oppError)
      return NextResponse.json({
        error: 'Failed to fetch opportunities'
      }, { status: 500 })
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({
        message: 'No opportunities found'
      })
    }

    // Update each opportunity with stage-based probability
    let updateCount = 0
    for (const opp of opportunities) {
      const stageConfig = stages.find((s: any) => s.id === opp.stage)

      if (stageConfig) {
        // Handle both number and string probabilities
        const probability = typeof stageConfig.probability === 'number'
          ? stageConfig.probability
          : parseInt(stageConfig.probability)

        if (!isNaN(probability)) {
          const { error: updateError } = await supabase
            .from('opportunities')
            .update({ probability })
            .eq('id', opp.id)
            .eq('tenant_id', session.user.tenantId)

          if (!updateError) {
            updateCount++
          } else {
            console.error(`Error updating opportunity ${opp.id}:`, updateError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updateCount} of ${opportunities.length} opportunities`,
      count: updateCount
    })
  } catch (error) {
    console.error('Error recalculating probabilities:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate probabilities' },
      { status: 500 }
    )
  }
}
