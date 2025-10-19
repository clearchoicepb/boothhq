import Link from 'next/link'
import { Eye, Edit, Mail, MessageSquare, Trash2 } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'
import { OpportunityEmptyState } from './opportunity-empty-state'
import { getOwnerDisplayName, getOwnerInitials, type TenantUser } from '@/lib/users'
import { getOpportunityProbability } from '@/lib/opportunity-utils'
import type { OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import { getStageColor, getStageName } from '@/lib/utils/stage-utils'
import { formatDateShort, getDaysUntil, isDateToday } from '@/lib/utils/date-utils'

interface OpportunityTableProps {
  opportunities: OpportunityWithRelations[]
  loading: boolean
  filterStage: string
  searchTerm: string
  filterOwner: string
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  settings: any
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  canCreate: boolean
  onPageChange: (page: number) => void
  onOpportunityClick: (opportunityId: string) => void
  onEmailClick: (opportunity: OpportunityWithRelations) => void
  onSMSClick: (opportunity: OpportunityWithRelations) => void
  onDeleteClick: (opportunityId: string) => void
  onClearSearch: () => void
  onClearStage: () => void
  onClearOwner: () => void
  onClearAll: () => void
}

/**
 * Desktop table view for opportunities list
 * Complete table with headers, loading states, empty states, and pagination
 * 
 * @param props - Table data and handlers
 * @returns Desktop table component
 */
export function OpportunityTable({
  opportunities,
  loading,
  filterStage,
  searchTerm,
  filterOwner,
  tenantSubdomain,
  tenantUsers,
  settings,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  canCreate,
  onPageChange,
  onOpportunityClick,
  onEmailClick,
  onSMSClick,
  onDeleteClick,
  onClearSearch,
  onClearStage,
  onClearOwner,
  onClearAll
}: OpportunityTableProps) {
  // Stage color and name now use centralized utility that reads from settings
  // This ensures colors and names are consistent with user's preferences

  const hasFilters = searchTerm !== '' || filterStage !== 'all' || filterOwner !== 'all'

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Owner</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                {(filterStage === 'closed_won' || filterStage === 'closed_lost') && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Reason</th>
                )}
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Prob</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Value</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Close Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Loading Skeleton */}
              {loading && (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-4 py-4 flex justify-center">
                        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty State */}
              {!loading && opportunities.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16">
                    <OpportunityEmptyState
                      hasFilters={hasFilters}
                      searchTerm={searchTerm}
                      filterStage={filterStage}
                      filterOwner={filterOwner}
                      tenantSubdomain={tenantSubdomain}
                      tenantUsers={tenantUsers}
                      canCreate={canCreate}
                      onClearSearch={onClearSearch}
                      onClearStage={onClearStage}
                      onClearOwner={onClearOwner}
                      onClearAll={onClearAll}
                    />
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading && opportunities.map((opportunity) => (
                <tr
                  key={opportunity.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  onClick={() => onOpportunityClick(opportunity.id)}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={opportunity.name}>
                      {opportunity.name}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={opportunity.account_name || ''}>
                    {opportunity.account_name || 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={opportunity.contact_name || ''}>
                    {opportunity.contact_name || 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {opportunity.owner_id ? (
                      <div
                        className="w-8 h-8 mx-auto rounded-full bg-[#347dc4] flex items-center justify-center text-white text-xs font-semibold"
                        title={getOwnerDisplayName(opportunity.owner_id, tenantUsers)}
                      >
                        {getOwnerInitials(opportunity.owner_id, tenantUsers)}
                      </div>
                    ) : (
                      <div
                        className="w-8 h-8 mx-auto rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
                        title="Unassigned"
                      >
                        ?
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stage, settings)}`}>
                      {getStageName(opportunity.stage, settings)}
                    </span>
                  </td>
                  {(filterStage === 'closed_won' || filterStage === 'closed_lost') && (
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {opportunity.close_reason ? (
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            opportunity.stage === 'closed_won'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {opportunity.close_reason}
                          </span>
                          {opportunity.close_notes && (
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={opportunity.close_notes}>
                              {opportunity.close_notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No reason provided</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900">
                    {getOpportunityProbability(opportunity, settings.opportunities)}%
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900">
                    ${opportunity.amount?.toLocaleString() || '0'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900">
                    {opportunity.expected_close_date ? (
                      <div className="flex items-center gap-2">
                        <span>{formatDateShort(opportunity.expected_close_date)}</span>
                        {getDaysUntil(opportunity.expected_close_date) !== null && 
                         getDaysUntil(opportunity.expected_close_date)! >= 0 && 
                         getDaysUntil(opportunity.expected_close_date)! <= 30 && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isDateToday(opportunity.expected_close_date) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isDateToday(opportunity.expected_close_date) ? 'Today' : `${getDaysUntil(opportunity.expected_close_date)}d`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link href={`/${tenantSubdomain}/opportunities/${opportunity.id}`}>
                        <button
                          className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                          onClick={(e) => e.stopPropagation()}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                        onClick={(e) => e.stopPropagation()}
                        title="Edit Opportunity"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEmailClick(opportunity)
                        }}
                        className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                        title="Send Email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSMSClick(opportunity)
                        }}
                        className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                        title="Send SMS"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteClick(opportunity.id)
                        }}
                        className="text-red-600 hover:text-red-800 cursor-pointer transition-colors duration-150 active:scale-95"
                        title="Delete Opportunity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          loading={loading}
        />
      </div>
    </>
  )
}

