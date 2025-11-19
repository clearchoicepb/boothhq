/**
 * Project Helper Functions
 * 
 * Shared utilities for project-related UI logic.
 * Follows DRY principle by centralizing common project formatting and styling logic.
 */

import type { ProjectStatus, ProjectPriority } from '@/types/project.types'

/**
 * Get Tailwind CSS classes for project status badges
 */
export function getProjectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'not_started':
      return 'bg-gray-100 text-gray-700'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-700'
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'cancelled':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

/**
 * Get Tailwind CSS classes for project priority badges
 */
export function getProjectPriorityColor(priority: ProjectPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700'
    case 'high':
      return 'bg-orange-100 text-orange-700'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700'
    case 'low':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

/**
 * Format a date string for display
 * @param date - ISO date string
 * @param fallback - Text to show if date is missing (default: '-')
 * @param format - Date format style ('short' | 'long')
 */
export function formatProjectDate(
  date?: string, 
  fallback: string = '-',
  format: 'short' | 'long' = 'short'
): string {
  if (!date) return fallback
  
  const options: Intl.DateTimeFormatOptions = format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' }
  
  return new Date(date).toLocaleDateString('en-US', options)
}

/**
 * Calculate days until a target date
 * @returns Number of days (positive = future, negative = past), or null if no date
 */
export function getDaysUntilTarget(targetDate?: string): number | null {
  if (!targetDate) return null
  
  const target = new Date(targetDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day
  target.setHours(0, 0, 0, 0)
  
  const diffMs = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Check if a project is overdue
 */
export function isProjectOverdue(
  targetDate?: string,
  status?: ProjectStatus
): boolean {
  if (!targetDate) return false
  if (status === 'completed' || status === 'cancelled') return false
  
  const daysUntil = getDaysUntilTarget(targetDate)
  return daysUntil !== null && daysUntil < 0
}

/**
 * Format project status for display (replace underscores with spaces, capitalize)
 */
export function formatProjectStatus(status: ProjectStatus): string {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

