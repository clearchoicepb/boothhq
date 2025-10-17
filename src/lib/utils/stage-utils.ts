/**
 * Stage Utilities
 * Centralized functions for handling opportunity stage colors and names
 * Reads from settings to ensure consistency across all views
 */

export interface StageConfig {
  id: string
  name: string
  probability: number
  color: string
  enabled: boolean
}

export interface OpportunitySettings {
  stages?: StageConfig[]
  autoCalculateProbability?: boolean
}

/**
 * Map color names to Tailwind CSS classes
 * Used for stage badges across the application
 */
const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-100 text-purple-800',
  orange: 'bg-orange-100 text-orange-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
}

/**
 * Get Tailwind CSS classes for a stage badge based on settings
 * 
 * @param stageId - The stage identifier (e.g., 'prospecting', 'closed_won')
 * @param settings - Opportunity settings object containing stage configurations
 * @returns Tailwind CSS classes for background and text color
 * 
 * @example
 * const classes = getStageColor('prospecting', settings)
 * // Returns: 'bg-blue-100 text-blue-800' (from settings or defaults)
 */
export function getStageColor(
  stageId: string,
  settings?: { opportunities?: OpportunitySettings }
): string {
  // Try to get color from settings
  const stageConfig = settings?.opportunities?.stages?.find(
    (s: StageConfig) => s.id === stageId
  )
  
  if (stageConfig?.color && colorMap[stageConfig.color]) {
    return colorMap[stageConfig.color]
  }
  
  // Fallback to sensible defaults based on stage ID
  const defaultColors: Record<string, string> = {
    prospecting: colorMap.blue,
    qualification: colorMap.yellow,
    proposal: colorMap.purple,
    negotiation: colorMap.orange,
    closed_won: colorMap.green,
    closed_lost: colorMap.red,
  }
  
  return defaultColors[stageId] || colorMap.gray
}

/**
 * Get human-readable stage name from settings
 * 
 * @param stageId - The stage identifier (e.g., 'prospecting', 'closed_won')
 * @param settings - Opportunity settings object containing stage configurations
 * @returns Display name for the stage
 * 
 * @example
 * const name = getStageName('closed_won', settings)
 * // Returns: 'Closed Won' (from settings) or 'Closed Won' (formatted fallback)
 */
export function getStageName(
  stageId: string,
  settings?: { opportunities?: OpportunitySettings }
): string {
  // Try to get name from settings
  const stageConfig = settings?.opportunities?.stages?.find(
    (s: StageConfig) => s.id === stageId
  )
  
  if (stageConfig?.name) {
    return stageConfig.name
  }
  
  // Fallback: format the ID nicely
  // 'closed_won' → 'Closed Won'
  // 'prospecting' → 'Prospecting'
  return stageId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get all available colors for stage configuration
 * Used in settings UI for color selection
 */
export function getAvailableColors(): Array<{ value: string; label: string; class: string }> {
  return [
    { value: 'blue', label: 'Blue', class: colorMap.blue },
    { value: 'yellow', label: 'Yellow', class: colorMap.yellow },
    { value: 'purple', label: 'Purple', class: colorMap.purple },
    { value: 'orange', label: 'Orange', class: colorMap.orange },
    { value: 'green', label: 'Green', class: colorMap.green },
    { value: 'red', label: 'Red', class: colorMap.red },
    { value: 'gray', label: 'Gray', class: colorMap.gray },
  ]
}

