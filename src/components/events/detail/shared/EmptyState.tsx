/**
 * Empty State Component
 * Displays helpful guidance when sections have no data
 *
 * Provides:
 * - Icon (visual anchor)
 * - Title (what's missing)
 * - Description (why it matters)
 * - Action button (how to add)
 */

'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'default' | 'subtle' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16'
  }

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const descriptionSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const variantClasses = {
    default: 'bg-gray-50',
    subtle: '',
    bordered: 'border-2 border-dashed border-gray-300 bg-gray-50/50'
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${variantClasses[variant]} rounded-lg`}>
      <div className="flex flex-col items-center max-w-sm space-y-3">
        {/* Icon */}
        <div className="rounded-full bg-gray-100 p-3">
          <Icon className={`${iconSizes[size]} text-gray-400`} />
        </div>

        {/* Title */}
        <h3 className={`${titleSizes[size]} font-semibold text-gray-900`}>
          {title}
        </h3>

        {/* Description */}
        <p className={`${descriptionSizes[size]} text-gray-500 max-w-xs`}>
          {description}
        </p>

        {/* Action Button */}
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="mt-2"
            variant="outline"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
