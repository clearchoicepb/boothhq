import Link from 'next/link'
import { Eye, Edit } from 'lucide-react'
import { getOwnerDisplayName, getOwnerInitials, type TenantUser } from '@/lib/users'
import { getOpportunityProbability } from '@/lib/opportunity-utils'
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
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer relative group ${
        isDragged ? 'opacity-50 scale-95 rotate-2' : ''
      }`}
    >
      {/* Owner badge */}
      <div
        className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-[10px] font-semibold shadow-sm"
        title={getOwnerDisplayName(opportunity.owner_id, tenantUsers)}
      >
        {getOwnerInitials(opportunity.owner_id, tenantUsers)}
      </div>

      {/* Drag handle indicator */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>

      <div className="text-sm font-medium text-gray-900 mb-1 truncate pr-4 pl-6">
        {opportunity.name}
      </div>
      <div className="text-xs text-gray-600 mb-2">
        {opportunity.account_name || 'No Account'}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-green-600">
          ${opportunity.amount?.toLocaleString() || '0'}
        </span>
        <span className="text-xs text-gray-500">
          {getOpportunityProbability(opportunity, settings.opportunities)}%
        </span>
      </div>
      <div className="mt-2 flex space-x-1">
        <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}`}>
          <button 
            className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            title="View Details"
          >
            <Eye className="h-3 w-3" />
          </button>
        </Link>
        <button 
          className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
          title="Edit Opportunity"
        >
          <Edit className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

