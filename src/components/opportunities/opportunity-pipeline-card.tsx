import { Calendar, DollarSign } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/date-utils'
import type { TenantUser } from '@/lib/users'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'

interface OpportunityPipelineCardProps {
  opportunity: OpportunityWithRelations
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  settings: any
  isDragged: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onClick: () => void
}

/**
 * Pipeline view card for individual opportunity
 * Draggable card with owner badge, amount, and quick actions
 * 
 * @param props - Opportunity data and drag handlers
 * @returns Draggable pipeline card component
 */
export function OpportunityPipelineCard({
  opportunity,
  tenantSubdomain,
  tenantUsers,
  settings,
  isDragged,
  onDragStart,
  onDragEnd,
  onClick
}: OpportunityPipelineCardProps) {
  const owner = tenantUsers?.find(u => u.id === opportunity.owner_id)
  const firstEventDate = (opportunity as any).event_dates?.[0]?.event_date || (opportunity as any).event_date
  const createdDate = opportunity.created_at ? formatDateShort(opportunity.created_at) : null

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white p-2 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer ${
        isDragged ? 'opacity-50 scale-95' : ''
      }`}
    >
      {/* LINE 1: Opportunity Name */}
      <div className="font-medium text-sm truncate mb-1">
        {opportunity.name}
      </div>
      
      {/* LINE 2: Event Date: XX Created Date xx */}
      <div className="text-xs text-gray-600 mb-1">
        Event Date: {firstEventDate ? formatDateShort(firstEventDate) : 'Not set'} Created Date {createdDate || 'Not set'}
      </div>
      
      {/* LINE 3: Potential Deal Value: $XX,XXX.XX */}
      <div className="text-xs text-gray-900 font-semibold">
        Potential Deal Value: ${(opportunity.amount || 0).toLocaleString('en-US', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
      </div>
    </div>
  )
}

