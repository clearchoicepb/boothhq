import { Search, X } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { TenantUser } from '@/lib/users'

interface OpportunityFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterStage: string
  onStageChange: (value: string) => void
  filterOwner: string
  onOwnerChange: (value: string) => void
  dateFilter: string
  onDateFilterChange: (value: string) => void
  dateType: 'created' | 'closed' | 'event'
  onDateTypeChange: (value: 'created' | 'closed' | 'event') => void
  sortBy: string
  onSortChange: (value: string) => void
  onClearAll: () => void
  tenantUsers: TenantUser[]
  settings: any
}

/**
 * Filter controls for opportunities list
 * Includes search, stage, owner, and date filters
 * 
 * @param props - Filter state and change handlers
 * @returns Filter UI component
 */
export function OpportunityFilters({
  searchTerm,
  onSearchChange,
  filterStage,
  onStageChange,
  filterOwner,
  onOwnerChange,
  dateFilter,
  onDateFilterChange,
  dateType,
  onDateTypeChange,
  sortBy,
  onSortChange,
  onClearAll,
  tenantUsers,
  settings
}: OpportunityFiltersProps) {
  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || filterStage !== 'all' || filterOwner !== 'all' || dateFilter !== 'all'
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="opportunity-search"
              name="opportunity-search"
              type="text"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Dropdowns - Stack on mobile, 2 cols on tablet, 5 cols on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Stage
            </label>
            <Select
              value={filterStage}
              onChange={(e) => onStageChange(e.target.value)}
            >
              <option value="all">All Stages</option>
              {(settings.opportunities?.stages || [
                { id: 'prospecting', name: 'Prospecting', enabled: true },
                { id: 'qualification', name: 'Qualification', enabled: true },
                { id: 'proposal', name: 'Proposal', enabled: true },
                { id: 'negotiation', name: 'Negotiation', enabled: true },
                { id: 'closed_won', name: 'Closed Won', enabled: true },
                { id: 'closed_lost', name: 'Closed Lost', enabled: true }
              ]).filter((stage: any) => stage.enabled !== false).map((stage: any) => (
                <option key={stage.id || stage} value={stage.id || stage}>
                  {stage.name || stage}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Owner
            </label>
            <Select
              value={filterOwner}
              onChange={(e) => onOwnerChange(e.target.value)}
            >
              <option value="all">All Owners</option>
              <option value="unassigned">Unassigned</option>
              {tenantUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Date
            </label>
            <Select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="last_12_months">Last 12 Months</option>
              <option value="current_week">Current Week</option>
              <option value="current_month">Current Month</option>
              <option value="current_quarter">Current Quarter</option>
              <option value="current_year">Current Year</option>
              <option value="previous_week">Previous Week</option>
              <option value="previous_month">Previous Month</option>
              <option value="previous_quarter">Previous Quarter</option>
              <option value="previous_year">Previous Year</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Type
            </label>
            <Select
              value={dateType}
              onChange={(e) => onDateTypeChange(e.target.value as 'created' | 'closed' | 'event')}
            >
              <option value="created">Date Created</option>
              <option value="event">Event Date</option>
              <option value="closed">Closed Date</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <Select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
            >
              <option value="event_date_asc">Event Date (Earliest)</option>
              <option value="event_date_desc">Event Date (Latest)</option>
              <option value="created_asc">Date Created (Oldest)</option>
              <option value="created_desc">Date Created (Newest)</option>
              <option value="value_desc">Value (High to Low)</option>
              <option value="value_asc">Value (Low to High)</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="probability_desc">Probability (High to Low)</option>
              <option value="probability_asc">Probability (Low to High)</option>
            </Select>
          </div>
        </div>

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

