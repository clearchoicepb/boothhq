'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SearchableSelect, SearchableOption } from '@/components/ui/searchable-select'
import { Filter, X, ChevronDown, ChevronUp, Save, BookmarkPlus } from 'lucide-react'
import { InventoryItemsFilter } from '@/hooks/useInventoryItemsData'

export interface InventoryFilterState extends InventoryItemsFilter {
  // Additional UI state
  isAdvancedOpen?: boolean
}

interface InventoryFiltersProps {
  filters: InventoryFilterState
  onFiltersChange: (filters: InventoryFilterState) => void
  categories: Array<{ id: string; category_name: string }>
  productGroups: Array<{ id: string; group_name: string }>
  users: Array<{ id: string; first_name: string; last_name: string }>
  physicalAddresses: Array<{ id: string; location_name: string }>
  onSaveView?: () => void
  counts?: {
    total: number
    available: number
    checkedOut: number
    longTerm: number
    dueThisWeek: number
  }
}

export function InventoryFilters({
  filters,
  onFiltersChange,
  categories,
  productGroups,
  users,
  physicalAddresses,
  onSaveView,
  counts
}: InventoryFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(filters.isAdvancedOpen || false)

  const handleFilterChange = (key: keyof InventoryFilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      page: 1 // Reset to page 1 when filters change
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      page: 1,
      limit: filters.limit || 50,
      sort: 'item_name',
      order: 'asc'
    })
  }

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.status ||
    filters.category ||
    filters.tracking_type ||
    filters.assigned_to_type ||
    filters.assigned_to_id ||
    filters.min_value ||
    filters.max_value ||
    filters.purchase_date_from ||
    filters.purchase_date_to
  )

  // Quick filter shortcuts
  const quickFilters = [
    { label: 'All', value: undefined, count: counts?.total },
    { label: 'Available', value: 'available', count: counts?.available },
    { label: 'Checked Out', value: 'checked_out', count: counts?.checkedOut },
    { label: 'Long-term', value: 'long_term', count: counts?.longTerm },
    { label: 'Due Soon', value: 'due_this_week', count: counts?.dueThisWeek }
  ]

  // Convert arrays to SearchableOptions
  const categoryOptions: SearchableOption[] = categories.map(cat => ({
    id: cat.category_name,
    label: cat.category_name
  }))

  const productGroupOptions: SearchableOption[] = productGroups.map(group => ({
    id: group.id,
    label: group.group_name
  }))

  const userOptions: SearchableOption[] = users.map(user => ({
    id: user.id,
    label: `${user.first_name} ${user.last_name}`
  }))

  const locationOptions: SearchableOption[] = physicalAddresses.map(loc => ({
    id: loc.id,
    label: loc.location_name
  }))

  return (
    <div className="space-y-4">
      {/* Quick Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {quickFilters.map((qf) => (
          <Button
            key={qf.label}
            variant={filters.status === qf.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('status', qf.value)}
          >
            {qf.label}
            {qf.count !== undefined && (
              <span className="ml-1.5 text-xs opacity-75">
                ({qf.count})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        {/* Search and Sort Row */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <Input
              type="text"
              placeholder="Search by name, serial, category, model..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Select
              value={filters.sort || 'item_name'}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-auto"
            >
              <option value="item_name">Name</option>
              <option value="item_category">Category</option>
              <option value="item_value">Value</option>
              <option value="purchase_date">Purchase Date</option>
              <option value="created_at">Date Added</option>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('order', filters.order === 'asc' ? 'desc' : 'asc')}
            >
              {filters.order === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          {/* Advanced Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
            {isAdvancedOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>

          {/* Save View */}
          {onSaveView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveView}
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Save View
            </Button>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {isAdvancedOpen && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <SearchableSelect
                  options={[{ id: '', label: 'All Categories' }, ...categoryOptions]}
                  value={filters.category || null}
                  onChange={(value) => handleFilterChange('category', value || undefined)}
                  placeholder="Select category"
                />
              </div>

              {/* Product Group Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Group
                </label>
                <SearchableSelect
                  options={[{ id: '', label: 'All Groups' }, ...productGroupOptions]}
                  value={filters.assigned_to_type === 'product_group' ? filters.assigned_to_id || null : null}
                  onChange={(value) => {
                    if (value) {
                      handleFilterChange('assigned_to_type', 'product_group')
                      handleFilterChange('assigned_to_id', value)
                    } else {
                      handleFilterChange('assigned_to_type', undefined)
                      handleFilterChange('assigned_to_id', undefined)
                    }
                  }}
                  placeholder="Select product group"
                />
              </div>

              {/* Tracking Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Type
                </label>
                <Select
                  value={filters.tracking_type || ''}
                  onChange={(e) => handleFilterChange('tracking_type', e.target.value || undefined)}
                >
                  <option value="">All Types</option>
                  <option value="serial_number">Serial Number</option>
                  <option value="total_quantity">Total Quantity</option>
                </Select>
              </div>

              {/* Assigned To (User) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To (User)
                </label>
                <SearchableSelect
                  options={[{ id: '', label: 'Any User' }, ...userOptions]}
                  value={filters.assigned_to_type === 'user' ? filters.assigned_to_id || null : null}
                  onChange={(value) => {
                    if (value) {
                      handleFilterChange('assigned_to_type', 'user')
                      handleFilterChange('assigned_to_id', value)
                    } else if (filters.assigned_to_type === 'user') {
                      handleFilterChange('assigned_to_type', undefined)
                      handleFilterChange('assigned_to_id', undefined)
                    }
                  }}
                  placeholder="Select user"
                />
              </div>

              {/* Assigned To (Location) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <SearchableSelect
                  options={[{ id: '', label: 'Any Location' }, ...locationOptions]}
                  value={filters.assigned_to_type === 'physical_address' ? filters.assigned_to_id || null : null}
                  onChange={(value) => {
                    if (value) {
                      handleFilterChange('assigned_to_type', 'physical_address')
                      handleFilterChange('assigned_to_id', value)
                    } else if (filters.assigned_to_type === 'physical_address') {
                      handleFilterChange('assigned_to_type', undefined)
                      handleFilterChange('assigned_to_id', undefined)
                    }
                  }}
                  placeholder="Select location"
                />
              </div>

              {/* Value Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value Range
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min $"
                    value={filters.min_value || ''}
                    onChange={(e) => handleFilterChange('min_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-1/2"
                  />
                  <Input
                    type="number"
                    placeholder="Max $"
                    value={filters.max_value || ''}
                    onChange={(e) => handleFilterChange('max_value', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-1/2"
                  />
                </div>
              </div>

              {/* Purchase Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date From
                </label>
                <Input
                  type="date"
                  value={filters.purchase_date_from || ''}
                  onChange={(e) => handleFilterChange('purchase_date_from', e.target.value || undefined)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date To
                </label>
                <Input
                  type="date"
                  value={filters.purchase_date_to || ''}
                  onChange={(e) => handleFilterChange('purchase_date_to', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
