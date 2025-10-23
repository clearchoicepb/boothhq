import Link from 'next/link'
import { Mail, MessageSquare, Calendar } from 'lucide-react'
import { getOwnerDisplayName, getOwnerInitials, type TenantUser } from '@/lib/users'
import { getOpportunityProbability, getWeightedValue } from '@/lib/opportunity-utils'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import { getStageColor, getStageName } from '@/lib/utils/stage-utils'
import { formatDateShort, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'
import { opportunityFieldRenderers } from '@/lib/opportunity-field-renderers'

interface OpportunityMobileCardProps {
  opportunity: OpportunityWithRelations
  index: number
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  settings: any
  onEmailClick: () => void
  onSMSClick: () => void
}

/**
 * Mobile card view for individual opportunity
 * Includes header, details grid, and action buttons
 * 
 * @param props - Opportunity data and handlers
 * @returns Mobile-optimized opportunity card
 */
export function OpportunityMobileCard({
  opportunity,
  index,
  tenantSubdomain,
  tenantUsers,
  settings,
  onEmailClick,
  onSMSClick
}: OpportunityMobileCardProps) {
  // Stage color and name now use centralized utility that reads from settings
  // This ensures colors and names are consistent with user's preferences

  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 border border-gray-200 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Header row with Owner badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Event Date */}
          <div className="text-xs text-gray-500">
            {opportunityFieldRenderers.eventDateCompact(opportunity)}
          </div>

          {/* Opportunity Name */}
          <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}`}>
            <h3 className="font-semibold text-gray-900 text-base truncate hover:text-[#347dc4]">
              {opportunity.name}
            </h3>
          </Link>

          {/* Client */}
          <div className="text-sm">
            {opportunityFieldRenderers.client(opportunity)}
          </div>
        </div>

        {/* Owner badge */}
        <div className="ml-3 flex-shrink-0">
          {opportunityFieldRenderers.owner(opportunity, tenantUsers, true)}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Stage</span>
          <div className="mt-1">
            {opportunityFieldRenderers.stage(opportunity, settings)}
          </div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Probability</span>
          <div className="mt-1">
            {opportunityFieldRenderers.probability(opportunity)}
          </div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Value</span>
          <div className="mt-1">
            {opportunityFieldRenderers.totalValue(opportunity)}
          </div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Created</span>
          <div className="mt-1">
            {opportunityFieldRenderers.dateCreatedCompact(opportunity)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}`}>
          <button className="text-sm text-[#347dc4] hover:text-[#2c6ba8] font-medium px-3 py-1.5 rounded-md hover:bg-blue-50 transition-all duration-150 hover:scale-105">
            View Details
          </button>
        </Link>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEmailClick()
            }}
            className="p-2 text-gray-600 hover:text-[#347dc4] hover:bg-gray-100 rounded-md transition-all duration-150 hover:scale-110"
            title="Send Email"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSMSClick()
            }}
            className="p-2 text-gray-600 hover:text-[#347dc4] hover:bg-gray-100 rounded-md transition-all duration-150 hover:scale-110"
            title="Send SMS"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

