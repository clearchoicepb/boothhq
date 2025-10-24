'use client'

interface TaskIndicatorProps {
  isOverdue: boolean
  isDueSoon: boolean
  className?: string
}

/**
 * Visual indicator for task status
 * - Red dot: Tasks due within 24 hours
 * - Blinking red dot: Overdue tasks
 */
export function TaskIndicator({ isOverdue, isDueSoon, className = '' }: TaskIndicatorProps) {
  if (!isDueSoon && !isOverdue) return null

  return (
    <div
      className={`w-2 h-2 rounded-full bg-red-500 ${
        isOverdue ? 'animate-pulse' : ''
      } ${className}`}
      title={isOverdue ? 'Overdue task' : 'Task due within 24 hours'}
    />
  )
}

