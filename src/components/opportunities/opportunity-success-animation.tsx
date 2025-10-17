import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface OpportunitySuccessAnimationProps {
  type: 'won' | 'lost' | null
}

/**
 * Animated success/failure indicator for opportunity status changes
 * Shows a bouncing icon with text when opportunity is closed
 * 
 * @param props - Animation type ('won' | 'lost' | null)
 * @returns Animated overlay component or null
 */
export function OpportunitySuccessAnimation({ type }: OpportunitySuccessAnimationProps) {
  if (!type) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className={`absolute transition-all duration-1000 ease-out ${
        type === 'won' 
          ? 'animate-bounce text-green-500' 
          : 'animate-bounce text-red-500'
      }`}>
        {type === 'won' ? (
          <div className="flex flex-col items-center">
            <ThumbsUp className="w-16 h-16 mb-2" />
            <div className="text-lg font-semibold text-green-600">Opportunity Won!</div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ThumbsDown className="w-16 h-16 mb-2" />
            <div className="text-lg font-semibold text-red-600">Opportunity Lost</div>
          </div>
        )}
      </div>
    </div>
  )
}

