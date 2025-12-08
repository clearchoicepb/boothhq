import React from 'react'

export type TimePeriod = 'week' | 'month' | 'year' | 'all'

interface PeriodOption {
  value: TimePeriod
  label: string
}

const periodOptions: PeriodOption[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' }
]

interface OpportunityStatsCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle?: string
  className?: string
  showPeriodSelector?: boolean
  selectedPeriod?: TimePeriod
  onPeriodChange?: (period: TimePeriod) => void
  isLoading?: boolean
}

/**
 * Reusable statistics card for opportunity metrics
 *
 * @param props - Card configuration
 * @returns Styled statistics card component
 */
export function OpportunityStatsCard({
  icon,
  title,
  value,
  subtitle,
  className = '',
  showPeriodSelector = false,
  selectedPeriod = 'month',
  onPeriodChange,
  isLoading = false
}: OpportunityStatsCardProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <p className="ml-3 text-sm font-medium text-gray-500">
            {title}
          </p>
        </div>
        {showPeriodSelector && onPeriodChange && (
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value as TimePeriod)}
            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600 focus:ring-1 focus:ring-[#347dc4] focus:border-[#347dc4] cursor-pointer"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse ml-11">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-1"></div>
          {subtitle && <div className="h-4 bg-gray-200 rounded w-2/3"></div>}
        </div>
      ) : (
        <div className="ml-11">
          <p className="text-2xl font-semibold text-gray-900">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

