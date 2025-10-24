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
      className={`bg-white p-2 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer relative ${
        isDragged ? 'opacity-50 scale-95' : ''
      }`}
    >
      {/* Top Left Corner: Date Created (extremely small, no label) */}
      <div className="absolute top-1 left-1 text-[9px] text-gray-400">
        {createdDate || ''}
      </div>
      
      {/* Top Right Corner: Owner Icon */}
      <div className="absolute top-1 right-1">
        {owner ? (
          <div 
            className="w-5 h-5 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-[10px] font-semibold"
            title={`${owner.first_name} ${owner.last_name}`}
          >
            {owner.first_name?.[0]}{owner.last_name?.[0]}
          </div>
        ) : (
          <div 
            className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]"
            title="Unassigned"
          >
            ?
          </div>
        )}
      </div>
      
      {/* LINE 1: Opportunity Name */}
      <div className="font-medium text-sm truncate mb-1 mt-3 pr-6">
        {opportunity.name}
      </div>
      
      {/* LINE 2: Event Date: xx/xx */}
      <div className="text-xs text-gray-600 mb-1">
        Event Date: {firstEventDate ? (() => {
          const date = new Date(firstEventDate + 'T00:00:00')
          return `${date.getMonth() + 1}/${date.getDate()}`
        })() : 'Not set'}
      </div>
      
      {/* LINE 3: Deal Size: $xx,xxx */}
      <div className="text-xs text-gray-900 font-semibold">
        Deal Size: ${(opportunity.amount || 0).toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })}
      </div>
    </div>
  )
}

