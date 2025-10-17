import React from 'react'

interface OpportunityStatsCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle?: string
  className?: string
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
  className = ''
}: OpportunityStatsCardProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-5">
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

