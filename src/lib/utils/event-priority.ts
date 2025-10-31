/**
 * Event Priority Calculation Utilities
 *
 * Calculates priority levels for events based on days until the event
 * and task completion status.
 */

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface PriorityConfig {
  bg: string
  text: string
  icon: string
  border: string
  label?: string
}

/**
 * Priority configuration mapping
 */
export const PRIORITY_CONFIG: Record<PriorityLevel, PriorityConfig> = {
  critical: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '🔴',
    border: 'border-l-4 border-red-500',
    label: 'CRITICAL'
  },
  high: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    icon: '🟠',
    border: 'border-l-4 border-orange-500',
    label: 'HIGH'
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '🟡',
    border: 'border-l-4 border-yellow-500',
    label: 'MEDIUM'
  },
  low: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '🔵',
    border: 'border-l-4 border-blue-500',
    label: 'LOW'
  },
  none: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: '⚪',
    border: '',
    label: ''
  }
}

/**
 * Priority thresholds in days
 */
export const PRIORITY_THRESHOLDS = {
  CRITICAL: 2,   // 0-2 days = critical (red)
  HIGH: 7,       // 3-7 days = high (orange)
  MEDIUM: 14,    // 8-14 days = medium (yellow)
  LOW: 30        // 15-30 days = low (blue)
} as const

/**
 * Calculate priority level based on days until event
 *
 * @param daysUntil - Number of days until the event (null for no date, negative for past events)
 * @returns Priority level
 *
 * @example
 * calculatePriorityLevel(1)    // 'critical' (1 day away)
 * calculatePriorityLevel(5)    // 'high' (5 days away)
 * calculatePriorityLevel(10)   // 'medium' (10 days away)
 * calculatePriorityLevel(20)   // 'low' (20 days away)
 * calculatePriorityLevel(50)   // 'none' (far future)
 * calculatePriorityLevel(-5)   // 'none' (past event)
 * calculatePriorityLevel(null) // 'none' (no date)
 */
export function calculatePriorityLevel(daysUntil: number | null): PriorityLevel {
  // No date or past event
  if (daysUntil === null || daysUntil < 0) {
    return 'none'
  }

  // Critical: 0-2 days (Red)
  if (daysUntil <= PRIORITY_THRESHOLDS.CRITICAL) {
    return 'critical'
  }

  // High: 3-7 days (Orange)
  if (daysUntil <= PRIORITY_THRESHOLDS.HIGH) {
    return 'high'
  }

  // Medium: 8-14 days (Yellow)
  if (daysUntil <= PRIORITY_THRESHOLDS.MEDIUM) {
    return 'medium'
  }

  // Low: 15-30 days (Blue)
  if (daysUntil <= PRIORITY_THRESHOLDS.LOW) {
    return 'low'
  }

  // None: 31+ days (Gray)
  return 'none'
}

/**
 * Get priority configuration for a given priority level
 *
 * @param level - Priority level
 * @returns Priority configuration (colors, icon, border)
 */
export function getPriorityConfig(level: PriorityLevel): PriorityConfig {
  return PRIORITY_CONFIG[level]
}

/**
 * Calculate priority level and config in one call
 *
 * @param daysUntil - Number of days until the event
 * @returns Object with priority level and configuration
 *
 * @example
 * const { level, config } = getEventPriority(5)
 * console.log(level)    // 'high'
 * console.log(config.bg) // 'bg-orange-100'
 * console.log(config.icon) // '🟠'
 */
export function getEventPriority(daysUntil: number | null): {
  level: PriorityLevel
  config: PriorityConfig
} {
  const level = calculatePriorityLevel(daysUntil)
  const config = getPriorityConfig(level)
  return { level, config }
}

/**
 * Custom priority thresholds for specific use cases
 * Allows overriding default thresholds
 */
export interface CustomPriorityThresholds {
  critical?: number
  high?: number
  medium?: number
  low?: number
}

/**
 * Calculate priority with custom thresholds
 *
 * @param daysUntil - Number of days until the event
 * @param customThresholds - Custom threshold overrides
 * @returns Priority level
 *
 * @example
 * // More aggressive prioritization
 * calculatePriorityWithThresholds(5, { critical: 5, high: 10 })
 * // Returns 'critical' instead of 'high'
 */
export function calculatePriorityWithThresholds(
  daysUntil: number | null,
  customThresholds: CustomPriorityThresholds
): PriorityLevel {
  if (daysUntil === null || daysUntil < 0) {
    return 'none'
  }

  const thresholds = {
    critical: customThresholds.critical ?? PRIORITY_THRESHOLDS.CRITICAL,
    high: customThresholds.high ?? PRIORITY_THRESHOLDS.HIGH,
    medium: customThresholds.medium ?? PRIORITY_THRESHOLDS.MEDIUM,
    low: customThresholds.low ?? PRIORITY_THRESHOLDS.LOW
  }

  if (daysUntil <= thresholds.critical) return 'critical'
  if (daysUntil <= thresholds.high) return 'high'
  if (daysUntil <= thresholds.medium) return 'medium'
  if (daysUntil <= thresholds.low) return 'low'
  return 'none'
}
