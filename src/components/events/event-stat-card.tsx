import { ReactNode } from 'react'

interface EventStatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  color?: string
  subtitle?: string
}

export function EventStatCard({
  icon,
  label,
  value,
  color = 'text-gray-900',
  subtitle,
}: EventStatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {subtitle && (
        <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      )}
    </div>
  )
}

