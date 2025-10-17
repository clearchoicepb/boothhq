import { ThumbsUp, ThumbsDown } from 'lucide-react'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'

interface ClosedOpportunitiesPopupProps {
  type: 'won' | 'lost' | null
  opportunities: OpportunityWithRelations[]
  tenantSubdomain: string
  onClose: () => void
  onDragStart: (e: React.DragEvent, opportunity: OpportunityWithRelations) => void
  onDragEnd: () => void
  onOpportunityClick: (opportunityId: string) => void
}

/**
 * Popup modal showing closed opportunities (won or lost)
 * Displays list of closed opportunities with drag-to-reopen functionality
 * 
 * @param props - Popup state and handlers
 * @returns Modal popup component
 */
export function ClosedOpportunitiesPopup({
  type,
  opportunities,
  tenantSubdomain,
  onClose,
  onDragStart,
  onDragEnd,
  onOpportunityClick
}: ClosedOpportunitiesPopupProps) {
  if (!type) return null

  const isWon = type === 'won'
  const stage = isWon ? 'closed_won' : 'closed_lost'
  const filteredOpportunities = opportunities.filter(opp => opp.stage === stage)

  return (
    <div 
      className="fixed top-4 right-4 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isWon ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {isWon ? (
                <ThumbsUp className="w-4 h-4 text-white" />
              ) : (
                <ThumbsDown className="w-4 h-4 text-white" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {isWon ? 'Closed Won' : 'Closed Lost'} ({filteredOpportunities.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          <div className="mb-3 text-xs text-gray-500">
            Drag opportunities back to any stage to move them out of the closed status.
          </div>
          
          <div className="space-y-2">
            {filteredOpportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative group"
                draggable
                onDragStart={(e) => onDragStart(e, opportunity)}
                onDragEnd={onDragEnd}
                onClick={() => onOpportunityClick(opportunity.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600">
                        {opportunity.account_name ? opportunity.account_name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{opportunity.name}</h4>
                      <p className="text-xs text-gray-600 truncate">
                        {opportunity.account_name} • ${opportunity.amount?.toLocaleString() || '0'}
                      </p>
                      {opportunity.close_reason && (
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                          isWon
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {opportunity.close_reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <span className="text-xs text-gray-500">
                    ${opportunity.amount?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            ))}
            
            {filteredOpportunities.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                No {isWon ? 'won' : 'lost'} opportunities yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

