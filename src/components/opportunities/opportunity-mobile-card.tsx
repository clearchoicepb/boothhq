import Link from 'next/link'
import { Mail, MessageSquare, Calendar } from 'lucide-react'
import { getOwnerDisplayName, getOwnerInitials, type TenantUser } from '@/lib/users'
import { getOpportunityProbability, getWeightedValue } from '@/lib/opportunity-utils'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import { getStageColor, getStageName } from '@/lib/utils/stage-utils'
import { formatDateShort, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'

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
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base mb-1 truncate">
            {opportunity.name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{opportunity.account_name || 'No Account'}</p>
          {opportunity.contact_name && (
            <p className="text-xs text-gray-500 truncate">{opportunity.contact_name}</p>
          )}
        </div>
        <div className="ml-3 flex-shrink-0">
          {/* Owner badge */}
          {opportunity.owner_id ? (
            <div
              className="w-10 h-10 rounded-full bg-[#347dc4] flex items-center justify-center text-white text-sm font-semibold"
              title={getOwnerDisplayName(opportunity.owner_id, tenantUsers)}
            >
              {getOwnerInitials(opportunity.owner_id, tenantUsers)}
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm"
              title="Unassigned"
            >
              ?
            </div>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <span className="text-gray-500">Stage:</span>
          <span className={`ml-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stage, settings)}`}>
            {getStageName(opportunity.stage, settings)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Probability:</span>
          <span className="ml-2 font-semibold">{getOpportunityProbability(opportunity, settings.opportunities)}%</span>
        </div>
        <div>
          <span className="text-gray-500">Value:</span>
          <span className="ml-2 font-semibold">${opportunity.amount?.toLocaleString() || '0'}</span>
        </div>
        <div>
          <span className="text-gray-500">Weighted:</span>
          <span className="ml-2">${getWeightedValue(opportunity, settings.opportunities).toLocaleString()}</span>
        </div>
      </div>

      {/* Close Date */}
      {opportunity.expected_close_date && (
        <div className="flex items-center gap-2 text-sm mb-3 pb-3 border-b border-gray-100">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Close Date:</span>
          <span className="font-medium">{formatDateShort(opportunity.expected_close_date)}</span>
          {getDaysUntil(opportunity.expected_close_date) !== null && 
           getDaysUntil(opportunity.expected_close_date)! >= 0 && 
           getDaysUntil(opportunity.expected_close_date)! <= 30 && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isDateToday(opportunity.expected_close_date) 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {isDateToday(opportunity.expected_close_date) ? 'Closes Today' : `${getDaysUntil(opportunity.expected_close_date)}d`}
            </span>
          )}
        </div>
      )}

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

