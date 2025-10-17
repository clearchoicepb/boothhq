interface EventProgressIndicatorProps {
  completed: number
  total: number
  label?: string
  showPercentage?: boolean
}

export function EventProgressIndicator({
  completed,
  total,
  label = 'Progress',
  showPercentage = true,
}: EventProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {completed} / {total}
          {showPercentage && ` (${percentage}%)`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

