import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface ClosedOpportunitiesBucketProps {
  type: 'won' | 'lost'
  count: number
  isDragOver: boolean
  onClick: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

/**
 * Bucket component for closed opportunities in pipeline view
 * Shows count and accepts drag-and-drop
 * 
 * @param props - Bucket configuration and handlers
 * @returns Clickable/droppable bucket component
 */
export function ClosedOpportunitiesBucket({
  type,
  count,
  isDragOver,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop
}: ClosedOpportunitiesBucketProps) {
  const isWon = type === 'won'
  
  const colors = {
    border: isDragOver 
      ? (isWon ? 'border-green-400' : 'border-red-400')
      : (isWon ? 'border-green-300' : 'border-red-300'),
    bg: isDragOver
      ? (isWon ? 'bg-green-50' : 'bg-red-50')
      : (isWon ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'),
    iconBg: isWon ? 'bg-green-500' : 'bg-red-500',
    textTitle: isWon ? 'text-green-800' : 'text-red-800',
    textCount: isWon ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${colors.border} ${colors.bg}`}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={`w-6 h-6 ${colors.iconBg} rounded-full flex items-center justify-center`}>
        {isWon ? (
          <ThumbsUp className="w-4 h-4 text-white" />
        ) : (
          <ThumbsDown className="w-4 h-4 text-white" />
        )}
      </div>
      <div className="text-sm">
        <div className={`font-medium ${colors.textTitle}`}>
          {isWon ? 'Closed Won' : 'Closed Lost'}
        </div>
        <div className={colors.textCount}>
          {count}
        </div>
      </div>
    </div>
  )
}

