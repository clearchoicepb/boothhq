import Link from 'next/link'
import { Eye, Edit } from 'lucide-react'
import { getOwnerDisplayName, getOwnerInitials, type TenantUser } from '@/lib/users'
import { getOpportunityProbability } from '@/lib/opportunity-utils'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import { opportunityFieldRenderers } from '@/lib/opportunity-field-renderers'

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
      <div className="absolute top-2 right-2">
        {opportunityFieldRenderers.owner(opportunity, tenantUsers, true)}
      </div>

      {/* Drag handle indicator */}
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>

      {/* Event Date */}
      <div className="text-xs text-gray-500 mb-2">
        {opportunityFieldRenderers.eventDateCompact(opportunity)}
      </div>

      {/* Opportunity Name */}
      <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}`}>
        <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2 hover:text-[#347dc4] cursor-pointer">
          {opportunity.name}
        </div>
      </Link>

      {/* Client */}
      <div className="mb-2">
        {opportunityFieldRenderers.clientCompact(opportunity)}
      </div>

      {/* Stage Badge */}
      <div className="mb-2">
        {opportunityFieldRenderers.stage(opportunity, settings)}
      </div>

      {/* Value + Probability */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {opportunityFieldRenderers.totalValueCompact(opportunity)}
        {opportunityFieldRenderers.probability(opportunity)}
      </div>
    </div>
  )
}

