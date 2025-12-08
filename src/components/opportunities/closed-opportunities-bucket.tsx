import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react'
import type { TimePeriod } from '@/components/ui/kpi-card'

interface ClosedOpportunitiesBucketProps {
  type: 'won' | 'lost' | 'stale'
  count: number
  timePeriod?: TimePeriod
  isDragOver: boolean
  onClick: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

const timePeriodLabels: Record<TimePeriod, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time'
}

/**
 * Bucket component for closed/terminal opportunities in pipeline view
 * Shows count and accepts drag-and-drop
 * Supports: won (green), lost (red), stale (gray)
 *
 * @param props - Bucket configuration and handlers
 * @returns Clickable/droppable bucket component
 */
export function ClosedOpportunitiesBucket({
  type,
  count,
  timePeriod = 'all',
  isDragOver,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop
}: ClosedOpportunitiesBucketProps) {
  const colorSchemes = {
    won: {
      border: isDragOver ? 'border-green-400' : 'border-green-300',
      bg: isDragOver ? 'bg-green-50' : 'bg-green-50 hover:bg-green-100',
      iconBg: 'bg-green-500',
      textTitle: 'text-green-800',
      textCount: 'text-green-600',
      label: 'Closed Won',
      Icon: ThumbsUp
    },
    lost: {
      border: isDragOver ? 'border-red-400' : 'border-red-300',
      bg: isDragOver ? 'bg-red-50' : 'bg-red-50 hover:bg-red-100',
      iconBg: 'bg-red-500',
      textTitle: 'text-red-800',
      textCount: 'text-red-600',
      label: 'Closed Lost',
      Icon: ThumbsDown
    },
    stale: {
      border: isDragOver ? 'border-gray-400' : 'border-gray-300',
      bg: isDragOver ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100',
      iconBg: 'bg-gray-500',
      textTitle: 'text-gray-800',
      textCount: 'text-gray-600',
      label: 'Stale',
      Icon: Clock
    }
  }

  const colors = colorSchemes[type]
  const Icon = colors.Icon

  return (
    <div
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${colors.border} ${colors.bg}`}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      title={`${colors.label} - ${timePeriodLabels[timePeriod]}`}
    >
      <div className={`w-6 h-6 ${colors.iconBg} rounded-full flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-sm">
        <div className={`font-medium ${colors.textTitle}`}>
          {colors.label}
        </div>
        <div className={`flex items-baseline gap-1 ${colors.textCount}`}>
          <span className="font-semibold">{count}</span>
          {timePeriod !== 'all' && (
            <span className="text-xs opacity-75">({timePeriodLabels[timePeriod].toLowerCase()})</span>
          )}
        </div>
      </div>
    </div>
  )
}

