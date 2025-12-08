'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Plus, DollarSign, Grid, List, Download, ListFilter } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV } from '@/lib/csv-export'
import { useParams } from 'next/navigation'
import { Select } from '@/components/ui/select'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import { SendEmailModal } from '@/components/send-email-modal'
import { SendSMSModal } from '@/components/send-sms-modal'
import { CloseOpportunityModal } from '@/components/close-opportunity-modal'
import { fetchTenantUsers, type TenantUser } from '@/lib/users'

// Custom hooks
import { useOpportunitiesData, type OpportunityWithRelations } from '@/hooks/useOpportunitiesData'
import { useOpportunityFilters } from '@/hooks/useOpportunityFilters'
import { useOpportunityCalculations } from '@/hooks/useOpportunityCalculations'
import { useOpportunityDragAndDrop } from '@/hooks/useOpportunityDragAndDrop'

// Opportunity components
import { KPICard, KPICardGrid, KPISection, periodOptionsWithAll, type TimePeriod } from '@/components/ui/kpi-card'
import { OpportunitySuccessAnimation } from '@/components/opportunities/opportunity-success-animation'
import { OpportunityEmptyState } from '@/components/opportunities/opportunity-empty-state'
import { OpportunityCalculationModeToggle } from '@/components/opportunities/opportunity-calculation-mode-toggle'
import { OpportunityFilters } from '@/components/opportunities/opportunity-filters'
import { OpportunityMobileCard } from '@/components/opportunities/opportunity-mobile-card'
import { ClosedOpportunitiesBucket } from '@/components/opportunities/closed-opportunities-bucket'
import { ClosedOpportunitiesPopup } from '@/components/opportunities/closed-opportunities-popup'
import { OpportunityTable } from '@/components/opportunities/opportunity-table'
import { OpportunityPipelineView } from '@/components/opportunities/opportunity-pipeline-view'
import { OpportunitySourceSelector } from '@/components/opportunity-source-selector'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('opportunities')

function OpportunitiesPageContent() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { settings, updateSettings } = useSettings()
  const { canCreate } = usePermissions()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  
  // Local state for view and modals
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [currentView, setCurrentView] = useState<'table' | 'pipeline' | 'cards'>('table')
  const [showBucketPopup, setShowBucketPopup] = useState<'won' | 'lost' | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showSMSModal, setShowSMSModal] = useState(false)
  const [showSourceSelector, setShowSourceSelector] = useState(false)
  const [sortBy, setSortBy] = useState<string>('event_date_asc')
  const [itemsPerPage, setItemsPerPage] = useState<number>(50)

  // Load items per page preference from localStorage after mount (avoid SSR issues)
  useEffect(() => {
    const savedLimit = localStorage.getItem('opportunities_per_page')
    if (savedLimit) {
      setItemsPerPage(parseInt(savedLimit))
    }
  }, [])

  // Close opportunity modal state
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [pendingCloseStage, setPendingCloseStage] = useState<'closed_won' | 'closed_lost' | null>(null)
  const [opportunityToClose, setOpportunityToClose] = useState<OpportunityWithRelations | null>(null)

  // Apply client-side filters first (to get filter state)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterOwner, setFilterOwner] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateType, setDateType] = useState<'created' | 'closed' | 'event'>('created')

  // Custom hooks for data management - NOW PASSES ACTUAL FILTERS TO BACKEND
  const {
    opportunities,
    setOpportunities,
    loading: localLoading,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    fetchOpportunities,
    handlePageChange,
    handleDeleteOpportunity,
  } = useOpportunitiesData({
    session,
    tenant,
    filterStage,      // Pass actual stage filter to backend
    filterOwner,      // Pass actual owner filter to backend
    currentView,
    currentPage: 1,
    itemsPerPage: itemsPerPage,
  })

  // Apply client-side filters (search and date only - stage/owner done server-side)
  const {
    filteredOpportunities,
  } = useOpportunityFilters({ opportunities, searchTerm, filterStage, filterOwner, dateFilter, dateType })

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setFilterStage('all')
    setFilterOwner('all')
    setDateFilter('all')
  }, [])

  // Helper function to get the earliest date from an opportunity
  const getEarliestDate = (opp: OpportunityWithRelations): number | null => {
    if (opp.event_dates && Array.isArray(opp.event_dates) && opp.event_dates.length > 0) {
      const dates = opp.event_dates
        .map((ed: any) => ed.event_date)
        .filter(Boolean)
        .map((d: string) => new Date(d).getTime())
      return dates.length > 0 ? Math.min(...dates) : null
    }
    return opp.event_date ? new Date(opp.event_date).getTime() : null
  }

  // Apply sorting to filtered opportunities
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    switch (sortBy) {
      case 'event_date_asc':
        const dateA = getEarliestDate(a)
        const dateB = getEarliestDate(b)
        if (!dateA && !dateB) return 0
        if (!dateA) return 1  // Push null dates to end
        if (!dateB) return -1
        return dateA - dateB
      case 'event_date_desc':
        const dateA2 = getEarliestDate(a)
        const dateB2 = getEarliestDate(b)
        if (!dateA2 && !dateB2) return 0
        if (!dateA2) return 1  // Push null dates to end
        if (!dateB2) return -1
        return dateB2 - dateA2
      case 'created_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'created_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'value_desc':
        return (b.amount || 0) - (a.amount || 0)
      case 'value_asc':
        return (a.amount || 0) - (b.amount || 0)
      case 'title_asc':
        return (a.name || '').localeCompare(b.name || '')
      case 'title_desc':
        return (b.name || '').localeCompare(a.name || '')
      case 'probability_desc':
        return (b.probability || 0) - (a.probability || 0)
      case 'probability_asc':
        return (a.probability || 0) - (b.probability || 0)
      default:
        return 0
    }
  })

  // Calculations (now from stats API - shows ALL opportunities, not just current page)
  const {
    calculationMode,
    setCalculationMode,
    currentStats,
    openOpportunities,
    loading: statsLoading,
    timePeriod,
    setTimePeriod,
  } = useOpportunityCalculations(filterStage, filterOwner, 'month')

  // Drag and drop
  const dragAndDrop = useOpportunityDragAndDrop({
    opportunities,
    setOpportunities,
    onShowCloseModal: (opportunity, stage) => {
      setOpportunityToClose(opportunity)
      setPendingCloseStage(stage)
      setShowCloseModal(true)
    },
  })

  // Fetch tenant users for owner filter
  useEffect(() => {
    if (session && tenant) {
      fetchTenantUsers().then(setTenantUsers)
    }
  }, [session, tenant])

  // Set view from settings
  useEffect(() => {
    if (settings.opportunities) {
      setCurrentView(settings.opportunities.defaultView || 'table')
    }
  }, [settings])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStage, filterOwner, searchTerm, dateFilter, dateType, setCurrentPage])

  // Save items per page preference
  useEffect(() => {
    localStorage.setItem('opportunities_per_page', itemsPerPage.toString())
    // Reset to page 1 when items per page changes
    setCurrentPage(1)
  }, [itemsPerPage, setCurrentPage])

  // Handler for changing items per page
  const handleItemsPerPageChange = (newLimit: number) => {
    setItemsPerPage(newLimit)
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
          <Link href="/auth/signin" className="mt-4 inline-block bg-[#347dc4] text-white px-4 py-2 rounded-md hover:bg-[#2c6ba8]">
            Sign In
          </Link>
        </div>
      </div>
    )
  }



  const handleViewChange = async (newView: 'table' | 'pipeline' | 'cards') => {
    setCurrentView(newView)
    
    // Save view preference to settings
    try {
      await updateSettings({
        ...settings,
        opportunities: {
          ...settings.opportunities,
          defaultView: newView
        }
      })
    } catch (error) {
      log.error({ error }, 'Error saving view preference')
    }
  }

  const handleCloseOpportunityConfirm = async (data: { closeReason: string; closeNotes: string }) => {
    if (!opportunityToClose || !pendingCloseStage) return

    await dragAndDrop.updateOpportunityStage(
      opportunityToClose.id,
      pendingCloseStage,
      data.closeReason,
      data.closeNotes
    )

    // Clean up
    setOpportunityToClose(null)
    setPendingCloseStage(null)
  }

  const handleExportCSV = () => {
    const columns = [
      { key: 'name', label: 'Opportunity Name' },
      { key: 'account_name', label: 'Account' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'stage', label: 'Stage' },
      { key: 'amount', label: 'Value' },
      { key: 'probability', label: 'Probability (%)' },
      { key: 'expected_close_date', label: 'Expected Close Date' },
      { key: 'created_at', label: 'Created Date' }
    ]
    
    const filename = `opportunities-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(sortedOpportunities, filename, columns)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Opportunities</h1>
                <p className="text-sm text-gray-600">Track your sales opportunities</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleExportCSV}
                  variant="outline"
                  className="transition-all duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {canCreate('opportunities') && (
                  <Button 
                    onClick={() => setShowSourceSelector(true)}
                    className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Opportunity
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Calculation Mode Toggle */}
          <OpportunityCalculationModeToggle
            mode={calculationMode}
            onChange={setCalculationMode}
            settings={settings}
          />

          {/* Statistics Cards */}
          <KPICardGrid columns={3} className="mb-8">
            <KPICard
              icon={<DollarSign className="h-5 w-5" />}
              label={calculationMode === 'total' ? 'Total Opportunities' : 'Open Opportunities'}
              value={currentStats.qty}
              subtitle={
                filterStage !== 'all' || filterOwner !== 'all'
                  ? 'Filtered total'
                  : timePeriod === 'all'
                    ? 'All opportunities'
                    : `Created ${timePeriod === 'week' ? 'this week' : timePeriod === 'month' ? 'this month' : 'this year'}`
              }
              dropdown={{
                value: timePeriod,
                options: periodOptionsWithAll,
                onChange: (value) => setTimePeriod(value as TimePeriod)
              }}
              loading={statsLoading}
            />

            <KPICard
              icon={<DollarSign className="h-5 w-5" />}
              label={calculationMode === 'total' ? 'Total Value' : 'Expected Value'}
              value={`$${Math.round(currentStats.amount).toLocaleString()}`}
              subtitle={
                calculationMode === 'expected'
                  ? `Probability-weighted ${settings.opportunities?.autoCalculateProbability ? '(stage-based)' : '(manual)'}`
                  : filterStage !== 'all' || filterOwner !== 'all'
                    ? 'Filtered total'
                    : timePeriod === 'all'
                      ? 'All opportunities'
                      : `From ${timePeriod === 'week' ? 'this week' : timePeriod === 'month' ? 'this month' : 'this year'}`
              }
              loading={statsLoading}
            />

            <KPICard
              icon={<DollarSign className="h-5 w-5" />}
              label="Open Opportunities"
              value={openOpportunities}
              subtitle={
                filterStage !== 'all' || filterOwner !== 'all'
                  ? 'Filtered count'
                  : timePeriod === 'all'
                    ? 'Not closed won/lost'
                    : `Not closed (${timePeriod === 'week' ? 'this week' : timePeriod === 'month' ? 'this month' : 'this year'})`
              }
              loading={statsLoading}
            />
          </KPICardGrid>

          {/* Filters and Search - Only show on table and card views */}
          {currentView !== 'pipeline' && (
            <OpportunityFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterStage={filterStage}
              onStageChange={setFilterStage}
              filterOwner={filterOwner}
              onOwnerChange={setFilterOwner}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              dateType={dateType}
              onDateTypeChange={setDateType}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onClearAll={clearAllFilters}
              tenantUsers={tenantUsers}
              settings={settings}
            />
          )}

          {/* View Toggle and Closed Buckets */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-gray-900">All Opportunities</h3>
                
                {/* Items Per Page Selector */}
                {currentView === 'table' && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ListFilter className="h-4 w-4" />
                    <span>Show</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                      className="w-20 h-8 text-sm"
                      aria-label="Items per page"
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </Select>
                    <span>per page</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Closed Buckets - Only show in pipeline view */}
                {currentView === 'pipeline' && (
                  <div className="flex gap-3">
                    <ClosedOpportunitiesBucket
                      type="won"
                      count={opportunities.filter(opp => opp.stage === 'closed_won').length}
                      isDragOver={dragAndDrop.dragOverStage === 'closed_won'}
                      onClick={() => setShowBucketPopup('won')}
                      onDragOver={(e) => dragAndDrop.handleDragOver(e, 'closed_won')}
                      onDragLeave={dragAndDrop.handleDragLeave}
                      onDrop={(e) => dragAndDrop.handleDrop(e, 'closed_won')}
                    />
                    <ClosedOpportunitiesBucket
                      type="lost"
                      count={opportunities.filter(opp => opp.stage === 'closed_lost').length}
                      isDragOver={dragAndDrop.dragOverStage === 'closed_lost'}
                      onClick={() => setShowBucketPopup('lost')}
                      onDragOver={(e) => dragAndDrop.handleDragOver(e, 'closed_lost')}
                      onDragLeave={dragAndDrop.handleDragLeave}
                      onDrop={(e) => dragAndDrop.handleDrop(e, 'closed_lost')}
                    />
                  </div>
                )}

                {/* View Toggle Buttons */}
                <div className="flex gap-2">
                <button
                    onClick={() => handleViewChange('table')}
                    className={`p-2 rounded-md transition-colors ${
                      currentView === 'table' 
                      ? 'bg-[#347dc4] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                    title="Table View"
                >
                    <List className="h-4 w-4" />
                </button>
                <button
                    onClick={() => handleViewChange('pipeline')}
                    className={`p-2 rounded-md transition-colors ${
                      currentView === 'pipeline' 
                      ? 'bg-[#347dc4] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                    title="Pipeline View"
                >
                    <Grid className="h-4 w-4" />
                </button>
                </div>
              </div>
            </div>
          </div>

          {/* Opportunities Content */}
          {currentView === 'table' && (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {/* Loading Skeleton - Mobile */}
              {localLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md p-4 border border-gray-200 animate-pulse">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="h-8 bg-gray-200 rounded w-24"></div>
                        <div className="flex gap-1">
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Empty State - Mobile */}
              {!localLoading && sortedOpportunities.length === 0 && (
                <div className="bg-white rounded-lg shadow-md border border-gray-200">
                  <OpportunityEmptyState
                    hasFilters={searchTerm !== '' || filterStage !== 'all' || filterOwner !== 'all'}
                    searchTerm={searchTerm}
                    filterStage={filterStage}
                    filterOwner={filterOwner}
                    tenantSubdomain={tenantSubdomain}
                    tenantUsers={tenantUsers}
                    canCreate={canCreate('opportunities')}
                    onClearSearch={() => setSearchTerm('')}
                    onClearStage={() => setFilterStage('all')}
                    onClearOwner={() => setFilterOwner('all')}
                    onClearAll={clearAllFilters}
                  />
                </div>
              )}

              {/* Data - Mobile Cards */}
              {!localLoading && sortedOpportunities.map((opportunity, index) => (
                <OpportunityMobileCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  index={index}
                  tenantSubdomain={tenantSubdomain}
                  tenantUsers={tenantUsers}
                  settings={settings}
                  onEmailClick={() => {
                          setSelectedOpportunity(opportunity)
                          setShowEmailModal(true)
                        }}
                  onSMSClick={() => {
                          setSelectedOpportunity(opportunity)
                          setShowSMSModal(true)
                        }}
                />
              ))}

              {/* Mobile Pagination */}
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  loading={localLoading}
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <OpportunityTable
              opportunities={sortedOpportunities}
              loading={localLoading}
              filterStage={filterStage}
              searchTerm={searchTerm}
              filterOwner={filterOwner}
              tenantSubdomain={tenantSubdomain}
              tenantUsers={tenantUsers}
              settings={settings}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              canCreate={canCreate('opportunities')}
              onPageChange={handlePageChange}
              onOpportunityClick={(id) => window.open(`/${tenantSubdomain}/opportunities/${id}`, '_blank')}
              onEmailClick={(opportunity) => {
                              setSelectedOpportunity(opportunity)
                              setShowEmailModal(true)
                            }}
              onSMSClick={(opportunity) => {
                              setSelectedOpportunity(opportunity)
                              setShowSMSModal(true)
                            }}
              onDeleteClick={handleDeleteOpportunity}
              onClearSearch={() => setSearchTerm('')}
              onClearStage={() => setFilterStage('all')}
              onClearOwner={() => setFilterOwner('all')}
              onClearAll={clearAllFilters}
            />
          </>
          )}

          {/* Pipeline View */}
          {currentView === 'pipeline' && (
            <OpportunityPipelineView
              opportunities={sortedOpportunities}
              settings={settings}
              tenantSubdomain={tenantSubdomain}
              tenantUsers={tenantUsers}
              draggedOpportunityId={dragAndDrop.draggedOpportunity?.id || null}
              dragOverStage={dragAndDrop.dragOverStage}
              onDragOver={dragAndDrop.handleDragOver}
              onDragLeave={dragAndDrop.handleDragLeave}
              onDrop={dragAndDrop.handleDrop}
              onDragStart={dragAndDrop.handleDragStart}
              onDragEnd={dragAndDrop.handleDragEnd}
              onOpportunityClick={(id) => window.open(`/${tenantSubdomain}/opportunities/${id}`, '_blank')}
            />
          )}

          {/* Success Animations */}
          <OpportunitySuccessAnimation type={dragAndDrop.showAnimation} />

          {/* Bucket Popup */}
          <ClosedOpportunitiesPopup
            type={showBucketPopup}
            opportunities={opportunities}
            tenantSubdomain={tenantSubdomain}
            onClose={() => setShowBucketPopup(null)}
            onDragStart={(e, opportunity) => dragAndDrop.handleDragStart(e, opportunity)}
            onDragEnd={dragAndDrop.handleDragEnd}
            onOpportunityClick={(id) => window.open(`/${tenantSubdomain}/opportunities/${id}`, '_blank')}
          />
        </div>
      </div>

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => {
          setShowEmailModal(false)
          setSelectedOpportunity(null)
        }}
        onSuccess={() => {
          fetchOpportunities()
          toast.success('Email sent successfully!')
        }}
        defaultSubject={selectedOpportunity ? `Regarding: ${selectedOpportunity.name}` : ''}
        opportunityId={selectedOpportunity?.id}
        accountId={selectedOpportunity?.account_id || undefined}
        contactId={selectedOpportunity?.contact_id || undefined}
      />

      {/* Send SMS Modal */}
      <SendSMSModal
        isOpen={showSMSModal}
        onClose={() => {
          setShowSMSModal(false)
          setSelectedOpportunity(null)
        }}
        onSuccess={() => {
          fetchOpportunities()
          toast.success('SMS sent successfully!')
        }}
        opportunityId={selectedOpportunity?.id}
        accountId={selectedOpportunity?.account_id || undefined}
        contactId={selectedOpportunity?.contact_id || undefined}
      />

      {/* Close Opportunity Modal */}
      {opportunityToClose && pendingCloseStage && (
        <CloseOpportunityModal
          isOpen={showCloseModal}
          onClose={() => {
            setShowCloseModal(false)
            setOpportunityToClose(null)
            setPendingCloseStage(null)
          }}
          opportunityId={opportunityToClose.id}
          opportunityName={opportunityToClose.name}
          closedAs={pendingCloseStage === 'closed_won' ? 'won' : 'lost'}
          onConfirm={handleCloseOpportunityConfirm}
        />
      )}

      {/* Opportunity Source Selector Modal */}
      <OpportunitySourceSelector
        isOpen={showSourceSelector}
        onClose={() => setShowSourceSelector(false)}
        tenantSubdomain={tenantSubdomain}
      />
    </AppLayout>
  )
}

// Wrap with access guard
export default function OpportunitiesPage() {
  return (
    <AccessGuard module="opportunities" action="view">
      <OpportunitiesPageContent />
    </AccessGuard>
  )
}