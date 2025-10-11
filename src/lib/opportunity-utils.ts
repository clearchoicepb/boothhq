export interface StageConfig {
  id: string
  name: string
  probability: number
  color?: string
  enabled?: boolean
}

export interface OpportunitySettings {
  autoCalculateProbability?: boolean
  stages?: StageConfig[]
}

// Minimal interface for opportunities - only fields we need
interface OpportunityLike {
  stage: string
  probability?: number | null
  amount?: number | null
}

/**
 * Get probability for an opportunity based on settings
 */
export function getOpportunityProbability(
  opportunity: OpportunityLike,
  settings?: OpportunitySettings
): number {
  // If auto-calculate is disabled, use the opportunity's probability
  if (!settings?.autoCalculateProbability) {
    return opportunity.probability ?? 0
  }

  // If auto-calculate is enabled, get probability from stage config
  const stageConfig = settings.stages?.find(
    s => s.id === opportunity.stage
  )

  return stageConfig?.probability ?? opportunity.probability ?? 0
}

/**
 * Calculate weighted value (amount × probability)
 */
export function getWeightedValue(
  opportunity: OpportunityLike,
  settings?: OpportunitySettings
): number {
  const amount = opportunity.amount ?? 0
  const probability = getOpportunityProbability(opportunity, settings)
  return Math.round(amount * (probability / 100))
}
