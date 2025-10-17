import { Search, Target, Plus, X } from 'lucide-react'
import Link from 'next/link'
import type { TenantUser } from '@/lib/users'
import { getOwnerDisplayName } from '@/lib/users'

interface OpportunityEmptyStateProps {
  hasFilters: boolean
  searchTerm: string
  filterStage: string
  filterOwner: string
  tenantSubdomain: string
  tenantUsers: TenantUser[]
  canCreate: boolean
  onClearSearch: () => void
  onClearStage: () => void
  onClearOwner: () => void
  onClearAll: () => void
}

/**
 * Empty state component for opportunities list
 * Shows different messages for filtered vs empty state
 * 
 * @param props - Filter state and clear handlers
 * @returns Empty state UI component
 */
export function OpportunityEmptyState({
  hasFilters,
  searchTerm,
  filterStage,
  filterOwner,
  tenantSubdomain,
  tenantUsers,
  canCreate,
  onClearSearch,
  onClearStage,
  onClearOwner,
  onClearAll
}: OpportunityEmptyStateProps) {
  return (
    <div className="text-center py-12">
      {/* Icon */}
      <div className={`inline-flex items-center justify-center ${hasFilters ? 'w-20 h-20 bg-gray-100' : 'w-24 h-24 bg-blue-50'} rounded-full mb-6`}>
        {hasFilters ? (
          <Search className="h-10 w-10 text-gray-400" />
        ) : (
          <Target className="h-12 w-12 text-blue-500" />
        )}
      </div>

      {/* Heading */}
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        {hasFilters
          ? 'No opportunities found'
          : 'No opportunities yet'
        }
      </h3>

      {/* Description */}
      <p className="text-gray-600 text-center max-w-md mx-auto mb-6 px-4">
        {hasFilters
          ? "We couldn't find any opportunities matching your filters. Try adjusting your search or filter criteria."
          : "Start tracking your sales pipeline by creating your first opportunity. Connect it to an account and watch your deals progress through stages."
        }
      </p>

      {/* Active filters chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2 justify-center mb-6 px-4">
          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              Search: &quot;{searchTerm}&quot;
              <button
                onClick={onClearSearch}
                className="ml-2 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterStage !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              Stage: {filterStage}
              <button
                onClick={onClearStage}
                className="ml-2 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                aria-label="Clear stage filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterOwner !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
              Owner: {getOwnerDisplayName(filterOwner, tenantUsers)}
              <button
                onClick={onClearOwner}
                className="ml-2 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                aria-label="Clear owner filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* CTA Button */}
      {hasFilters ? (
        <button
          onClick={onClearAll}
          className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Clear all filters
        </button>
      ) : canCreate && (
        <>
          <Link href={`/${tenantSubdomain}/opportunities/new`}>
            <button className="inline-flex items-center px-6 py-3 bg-[#347dc4] text-white font-medium rounded-lg hover:bg-[#2d6ba8] transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-md">
              <Plus className="h-5 w-5 mr-2" />
              Create First Opportunity
            </button>
          </Link>
          {/* Help text */}
          <p className="text-sm text-gray-500 mt-6">
            Or import opportunities from a CSV file
          </p>
        </>
      )}
    </div>
  )
}

