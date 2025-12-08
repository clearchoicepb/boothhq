/**
 * Opportunity stage constants and helper functions
 *
 * These constants define which stages are considered "closed" (terminal)
 * vs "open" (active). Use these helpers throughout the codebase to ensure
 * consistent behavior for stage-based filtering and calculations.
 *
 * IMPORTANT: Stages are tenant-configurable. Do NOT hardcode specific
 * "open" stage names (like 'prospecting', 'qualification'). Instead,
 * define stages as "closed" and treat everything else as "open".
 */

/**
 * Terminal stages that represent closed opportunities.
 * Opportunities in these stages are not considered part of the active pipeline.
 *
 * - closed_won: Successfully converted to revenue
 * - closed_lost: Lost to competition or declined
 * - stale: Inactive/abandoned opportunities (stage unchanged 21+ days)
 */
export const CLOSED_STAGES = ['closed_won', 'closed_lost', 'stale'] as const

/**
 * Type for closed stage identifiers
 */
export type ClosedStage = typeof CLOSED_STAGES[number]

/**
 * Check if a stage is considered "closed" (terminal)
 *
 * @param stage - The stage identifier to check
 * @returns true if the stage is a closed/terminal stage
 */
export function isClosedStage(stage: string | null | undefined): boolean {
  if (!stage) return false
  return CLOSED_STAGES.includes(stage as ClosedStage)
}

/**
 * Check if a stage is considered "open" (active pipeline)
 *
 * @param stage - The stage identifier to check
 * @returns true if the stage is an open/active stage
 */
export function isOpenStage(stage: string | null | undefined): boolean {
  if (!stage) return false
  return !isClosedStage(stage)
}

/**
 * Filter an array to get only opportunities in open stages
 *
 * @param opportunities - Array of objects with a 'stage' property
 * @returns Filtered array containing only open opportunities
 */
export function filterOpenOpportunities<T extends { stage: string }>(
  opportunities: T[]
): T[] {
  return opportunities.filter(opp => isOpenStage(opp.stage))
}

/**
 * Filter an array to get only opportunities in closed stages
 *
 * @param opportunities - Array of objects with a 'stage' property
 * @returns Filtered array containing only closed opportunities
 */
export function filterClosedOpportunities<T extends { stage: string }>(
  opportunities: T[]
): T[] {
  return opportunities.filter(opp => isClosedStage(opp.stage))
}
