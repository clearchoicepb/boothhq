'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all'

interface DropdownOption {
  label: string
  value: string
}

interface KPICardProps {
  // Content
  label: string
  value: string | number
  secondaryValue?: string | number
  secondaryLabel?: string
  subtitle?: string

  // Styling
  size?: 'compact' | 'standard'
  icon?: React.ReactNode
  className?: string

  // Interactivity
  onClick?: () => void

  // States
  loading?: boolean
  empty?: boolean
  emptyText?: string

  // Optional inline dropdown
  dropdown?: {
    value: string
    options: DropdownOption[]
    onChange: (value: string) => void
  }

  // Trend indicator (optional)
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
}

/**
 * Reusable KPI Card component for dashboards
 *
 * Supports two size variants:
 * - 'standard': Larger card with prominent values (default)
 * - 'compact': Smaller card for 4-per-row layouts
 *
 * Features:
 * - Loading skeleton state
 * - Empty/N/A state
 * - Optional icon
 * - Optional inline dropdown (time period selector)
 * - Optional trend indicator
 * - Click handler for drill-down modals
 * - Keyboard accessible
 */
export function KPICard({
  label,
  value,
  secondaryValue,
  secondaryLabel,
  subtitle,
  size = 'standard',
  icon,
  className,
  onClick,
  loading = false,
  empty = false,
  emptyText = 'N/A',
  dropdown,
  trend
}: KPICardProps) {
  const isInteractive = !!onClick
  const isCompact = size === 'compact'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault()
      onClick()
    }
  }

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  // Format the display value
  const displayValue = empty ? emptyText : value

  // Trend arrow and color
  const getTrendStyles = () => {
    if (!trend) return null
    const colors = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-500'
    }
    const arrows = {
      up: '\u2191',
      down: '\u2193',
      neutral: '\u2192'
    }
    return {
      color: colors[trend.direction],
      arrow: arrows[trend.direction]
    }
  }

  const trendStyles = getTrendStyles()

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow border border-transparent transition-all duration-200',
        isCompact ? 'p-4' : 'p-4 lg:p-6',
        isInteractive && 'cursor-pointer hover:shadow-lg hover:border-[#347dc4]',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
    >
      {/* Header: Icon + Label + Dropdown */}
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={cn(
              'flex-shrink-0 p-2 bg-blue-100 rounded-lg',
              isCompact && 'p-1.5'
            )}>
              <div className={cn(
                'text-[#347dc4]',
                isCompact ? '[&>svg]:h-4 [&>svg]:w-4' : '[&>svg]:h-5 [&>svg]:w-5'
              )}>
                {icon}
              </div>
            </div>
          )}
          <span className={cn(
            'font-medium text-gray-600',
            isCompact ? 'text-xs' : 'text-sm'
          )}>
            {label}
          </span>
        </div>

        {dropdown && (
          <select
            value={dropdown.value}
            onChange={(e) => dropdown.onChange(e.target.value)}
            onClick={handleDropdownClick}
            onKeyDown={handleDropdownKeyDown}
            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600 focus:ring-1 focus:ring-[#347dc4] focus:border-[#347dc4] cursor-pointer"
          >
            {dropdown.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn('animate-pulse', icon && 'ml-9 lg:ml-11')}>
          <div className={cn(
            'bg-gray-200 rounded mb-1',
            isCompact ? 'h-6 w-12' : 'h-8 w-1/2'
          )} />
          {(secondaryLabel || subtitle) && (
            <div className={cn(
              'bg-gray-200 rounded',
              isCompact ? 'h-3 w-16' : 'h-4 w-2/3'
            )} />
          )}
        </div>
      ) : (
        <div className={icon ? 'ml-9 lg:ml-11' : ''}>
          {/* Primary Value */}
          <div className={cn(
            'font-bold text-gray-900 mb-0.5',
            isCompact ? 'text-xl lg:text-2xl' : 'text-3xl lg:text-4xl',
            empty && 'text-gray-400'
          )}>
            {displayValue}
          </div>

          {/* Secondary Value with Label */}
          {secondaryValue !== undefined && secondaryLabel && !empty && (
            <div className={cn(
              'text-gray-500',
              isCompact ? 'text-xs' : 'text-sm'
            )}>
              {secondaryLabel}: <span className="font-medium text-gray-700">{secondaryValue}</span>
            </div>
          )}

          {/* Secondary Value without Label */}
          {secondaryValue !== undefined && !secondaryLabel && !empty && (
            <div className={cn(
              'font-medium text-gray-600',
              isCompact ? 'text-xs' : 'text-sm'
            )}>
              {secondaryValue}
            </div>
          )}

          {/* Subtitle (standalone, no secondary value) */}
          {subtitle && !secondaryValue && (
            <p className={cn(
              'text-gray-500 mt-0.5',
              isCompact ? 'text-xs' : 'text-xs'
            )}>
              {subtitle}
            </p>
          )}

          {/* Trend Indicator */}
          {trend && !empty && (
            <div className={cn(
              'mt-1',
              isCompact ? 'text-xs' : 'text-sm',
              trendStyles?.color
            )}>
              {trendStyles?.arrow} {trend.value}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Grid wrapper for KPI cards with responsive column layouts
 */
interface KPICardGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export function KPICardGrid({
  children,
  columns = 4,
  className
}: KPICardGridProps) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn(
      'grid gap-4 lg:gap-6',
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Section wrapper for KPI cards with title and global filters
 */
interface KPISectionProps {
  title?: string
  children: React.ReactNode
  className?: string

  // Global time period filter
  timePeriod?: {
    value: string
    options: DropdownOption[]
    onChange: (value: string) => void
  }

  // Global toggle (e.g., Total/Weighted)
  toggle?: {
    value: string
    options: DropdownOption[]
    onChange: (value: string) => void
  }
}

export function KPISection({
  title,
  children,
  className,
  timePeriod,
  toggle
}: KPISectionProps) {
  const hasControls = timePeriod || toggle

  return (
    <div className={cn('mb-8', className)}>
      {(title || hasControls) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          )}
          {!title && <div />}

          {hasControls && (
            <div className="flex items-center gap-3">
              {toggle && (
                <select
                  value={toggle.value}
                  onChange={(e) => toggle.onChange(e.target.value)}
                  className="text-sm bg-white border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-[#347dc4] focus:border-[#347dc4] cursor-pointer"
                >
                  {toggle.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {timePeriod && (
                <select
                  value={timePeriod.value}
                  onChange={(e) => timePeriod.onChange(e.target.value)}
                  className="text-sm bg-white border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 focus:ring-1 focus:ring-[#347dc4] focus:border-[#347dc4] cursor-pointer"
                >
                  {timePeriod.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  )
}

// Re-export commonly used period options
export const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' }
]

export const periodOptionsWithAll = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' }
]
