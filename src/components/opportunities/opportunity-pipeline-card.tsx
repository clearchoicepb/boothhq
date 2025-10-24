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
      {/* LINE 1: Opportunity Name + Owner Avatar */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-medium text-sm truncate flex-1">
          {opportunity.name}
        </span>
        
        {owner && (
          <div 
            className="w-5 h-5 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            title={`${owner.first_name} ${owner.last_name}`}
          >
            {owner.first_name?.[0]}{owner.last_name?.[0]}
          </div>
        )}
      </div>
      
      {/* LINE 2: Date Created • Event Date • Value */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {/* Date Created */}
        {createdDate && (
          <span className="truncate">{createdDate}</span>
        )}
        
        {createdDate && firstEventDate && <span>•</span>}
        
        {/* Event Date */}
        {firstEventDate && (
          <div className="flex items-center gap-1 truncate">
            <Calendar className="h-3 w-3" />
            <span>{formatDateShort(firstEventDate)}</span>
          </div>
        )}
        
        {(createdDate || firstEventDate) && <span>•</span>}
        
        {/* Value */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <DollarSign className="h-3 w-3" />
          <span className="font-semibold text-green-600">
            {opportunity.amount ? `${(opportunity.amount / 1000).toFixed(0)}k` : '0'}
          </span>
        </div>
      </div>
    </div>
  )
}

