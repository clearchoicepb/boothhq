'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Search, Plus, DollarSign, Eye, Edit, Trash2, Grid, List, ThumbsUp, ThumbsDown, Mail, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AccessGuard } from '@/components/access-guard'
import { usePermissions } from '@/lib/permissions'
import type { Opportunity } from '@/lib/supabase-client'
import { SendEmailModal } from '@/components/send-email-modal'
import { SendSMSModal } from '@/components/send-sms-modal'

interface OpportunityWithRelations extends Opportunity {
  account_name: string | null
  account_type: 'individual' | 'company' | null
  contact_name: string | null
}

function OpportunitiesPageContent() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const { settings, updateSettings } = useSettings()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [currentView, setCurrentView] = useState<'table' | 'pipeline' | 'cards'>('table')
  const [draggedOpportunity, setDraggedOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [calculationMode, setCalculationMode] = useState<'total' | 'private' | 'company' | 'expected'>('total')
  const [showAnimation, setShowAnimation] = useState<'won' | 'lost' | null>(null)
  const [showBucketPopup, setShowBucketPopup] = useState<'won' | 'lost' | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateType, setDateType] = useState<'created' | 'closed'>('created')
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithRelations | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showSMSModal, setShowSMSModal] = useState(false)

  useEffect(() => {
    if (session && tenant) {
      fetchOpportunities()
    }
  }, [session, tenant, filterStage])

  // Set view from settings
  useEffect(() => {
    if (settings.opportunities) {
      setCurrentView(settings.opportunities.defaultView || 'table')
    }
  }, [settings])

  const fetchOpportunities = async () => {
    try {
      setLocalLoading(true)
      const response = await fetch(`/api/entities/opportunities?stage=${filterStage}`)
      if (response.ok) {
        const data = await response.json()
        setOpportunities(data)
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const handleDeleteOpportunity = async (opportunityId: string) => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      try {
        const response = await fetch(`/api/entities/opportunities/${opportunityId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setOpportunities(opportunities.filter(opportunity => opportunity.id !== opportunityId))
        }
      } catch (error) {
        console.error('Error deleting opportunity:', error)
      }
    }
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

  // Helper functions for date filtering
  const getDateRange = (filter: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (filter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) }
      
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        return { start: yesterday, end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) }
      
      case 'last_7_days':
        return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
      
      case 'last_30_days':
        return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }
      
      case 'last_90_days':
        return { start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), end: now }
      
      case 'last_12_months':
        const last12Months = new Date(now)
        last12Months.setMonth(last12Months.getMonth() - 12)
        return { start: last12Months, end: now }
      
      case 'current_week':
        const currentWeekStart = new Date(today)
        currentWeekStart.setDate(today.getDate() - today.getDay())
        const currentWeekEnd = new Date(currentWeekStart)
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
        currentWeekEnd.setHours(23, 59, 59, 999)
        return { start: currentWeekStart, end: currentWeekEnd }
      
      case 'current_month':
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        return { start: currentMonthStart, end: currentMonthEnd }
      
      case 'current_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const currentQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
        const currentQuarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999)
        return { start: currentQuarterStart, end: currentQuarterEnd }
      
      case 'current_year':
        const currentYearStart = new Date(now.getFullYear(), 0, 1)
        const currentYearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        return { start: currentYearStart, end: currentYearEnd }
      
      case 'previous_week':
        const prevWeekStart = new Date(today)
        prevWeekStart.setDate(today.getDate() - today.getDay() - 7)
        const prevWeekEnd = new Date(prevWeekStart)
        prevWeekEnd.setDate(prevWeekStart.getDate() + 6)
        prevWeekEnd.setHours(23, 59, 59, 999)
        return { start: prevWeekStart, end: prevWeekEnd }
      
      case 'previous_month':
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        return { start: prevMonthStart, end: prevMonthEnd }
      
      case 'previous_quarter':
        const prevQuarter = Math.floor(now.getMonth() / 3) - 1
        const prevQuarterStart = new Date(now.getFullYear(), prevQuarter * 3, 1)
        const prevQuarterEnd = new Date(now.getFullYear(), (prevQuarter + 1) * 3, 0, 23, 59, 59, 999)
        return { start: prevQuarterStart, end: prevQuarterEnd }
      
      case 'previous_year':
        const prevYearStart = new Date(now.getFullYear() - 1, 0, 1)
        const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        return { start: prevYearStart, end: prevYearEnd }
      
      default:
        return null
    }
  }

  const isOpportunityInDateRange = (opportunity: OpportunityWithRelations, filter: string, dateType: 'created' | 'closed') => {
    if (filter === 'all') return true
    
    const dateRange = getDateRange(filter)
    if (!dateRange) return true
    
    let opportunityDate: Date | null = null
    
    if (dateType === 'created') {
      opportunityDate = new Date(opportunity.created_at)
    } else if (dateType === 'closed') {
      opportunityDate = opportunity.actual_close_date ? new Date(opportunity.actual_close_date) : null
    }
    
    if (!opportunityDate) return false
    
    return opportunityDate >= dateRange.start && opportunityDate <= dateRange.end
  }

  // Calculation functions
  const calculateTotalOpportunities = () => {
    const totalQty = opportunities.length
    const totalAmount = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    return { qty: totalQty, amount: totalAmount }
  }

  const calculatePrivateEventOpportunities = () => {
    const privateOpps = opportunities.filter((opp: OpportunityWithRelations) => opp.account_type === 'individual')
    const qty = privateOpps.length
    const amount = privateOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    return { qty, amount }
  }

  const calculateCompanyOpportunities = () => {
    const companyOpps = opportunities.filter((opp: OpportunityWithRelations) => opp.account_type === 'company')
    const qty = companyOpps.length
    const amount = companyOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    return { qty, amount }
  }

  const calculateExpectedValue = () => {
    const openOpps = opportunities.filter((opp: OpportunityWithRelations) => !['closed_won', 'closed_lost'].includes(opp.stage))
    
    // Check if auto-calculate probability is enabled in settings
    const autoCalculateProbability = settings.opportunities?.autoCalculateProbability ?? true
    const stages = settings.opportunities?.stages || []
    
    const expectedValue = openOpps.reduce((sum, opp) => {
      const amount = opp.amount || 0
      let probability = 0
      
      if (autoCalculateProbability) {
        // Use stage-based probability from settings
        const stageSettings = stages.find((stage: any) => stage.id === opp.stage)
        probability = stageSettings?.probability || 0
      } else {
        // Use individual opportunity probability
        probability = opp.probability || 0
      }
      
      return sum + (amount * probability / 100)
    }, 0)
    
    return { qty: openOpps.length, amount: expectedValue }
  }

  // Get current calculation based on mode
  const getCurrentCalculation = () => {
    switch (calculationMode) {
      case 'total':
        return calculateTotalOpportunities()
      case 'private':
        return calculatePrivateEventOpportunities()
      case 'company':
        return calculateCompanyOpportunities()
      case 'expected':
        return calculateExpectedValue()
      default:
        return calculateTotalOpportunities()
    }
  }

  const currentStats = getCurrentCalculation()
  const openOpportunities = opportunities.filter(opp => !['closed_won', 'closed_lost'].includes(opp.stage)).length

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opportunity.description && opportunity.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (opportunity.account_name && opportunity.account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (opportunity.contact_name && opportunity.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStage = filterStage === 'all' || opportunity.stage === filterStage
    
    const matchesDate = isOpportunityInDateRange(opportunity, dateFilter, dateType)
    
    return matchesSearch && matchesStage && matchesDate
  })

  // Helper function to get the correct probability for an opportunity
  const getOpportunityProbability = (opportunity: OpportunityWithRelations) => {
    const autoCalculateProbability = settings.opportunities?.autoCalculateProbability ?? true
    const stages = settings.opportunities?.stages || []
    
    if (autoCalculateProbability) {
      // Use stage-based probability from settings
      const stageSettings = stages.find((stage: any) => stage.id === opportunity.stage)
      return stageSettings?.probability || 0
    } else {
      // Use individual opportunity probability
      return opportunity.probability || 0
    }
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
      console.error('Error saving view preference:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, opportunity: OpportunityWithRelations) => {
    setDraggedOpportunity(opportunity)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    setDragOverStage(null)

    if (!draggedOpportunity || draggedOpportunity.stage === newStage) {
      setDraggedOpportunity(null)
      return
    }

    try {
      // Update the opportunity stage via API
      const response = await fetch(`/api/entities/opportunities/${draggedOpportunity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: newStage
        }),
      })

      if (response.ok) {
        // Update local state optimistically
        setOpportunities(prev => 
          prev.map(opp => 
            opp.id === draggedOpportunity.id 
              ? { ...opp, stage: newStage }
              : opp
          )
        )
        
        // Show animation for closed buckets
        if (newStage === 'closed_won') {
          setShowAnimation('won')
          setTimeout(() => setShowAnimation(null), 2000)
        } else if (newStage === 'closed_lost') {
          setShowAnimation('lost')
          setTimeout(() => setShowAnimation(null), 2000)
        }
      } else {
        console.error('Failed to update opportunity stage')
      }
    } catch (error) {
      console.error('Error updating opportunity stage:', error)
    }

    setDraggedOpportunity(null)
  }

  const handleDragEnd = () => {
    setDraggedOpportunity(null)
    setDragOverStage(null)
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
              {canCreate('opportunities') && (
              <Link href={`/${tenantSubdomain}/opportunities/new-sequential`}>
                <Button className="bg-[#347dc4] hover:bg-[#2c6ba8] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Opportunity
                </Button>
              </Link>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Calculation Mode Toggle */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Statistics Calculation - {calculationMode === 'total' && 'Total View'}
                  {calculationMode === 'private' && 'Private Events View'}
                  {calculationMode === 'company' && 'Company View'}
                  {calculationMode === 'expected' && 'Expected Value View'}
                </h3>
                {calculationMode === 'expected' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Using {settings.opportunities?.autoCalculateProbability ? 'stage-based' : 'individual'} probabilities
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalculationMode('total')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    calculationMode === 'total' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() => setCalculationMode('private')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    calculationMode === 'private' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Private Events
                </button>
                <button
                  onClick={() => setCalculationMode('company')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    calculationMode === 'company' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Company
                </button>
                <button
                  onClick={() => setCalculationMode('expected')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    calculationMode === 'expected' 
                      ? 'bg-[#347dc4] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Expected Value
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-[#347dc4]" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">
                    {calculationMode === 'total' && 'Total Opportunities'}
                    {calculationMode === 'private' && 'Private Event Opportunities'}
                    {calculationMode === 'company' && 'Company Opportunities'}
                    {calculationMode === 'expected' && 'Expected Opportunities'}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">{currentStats.qty}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-[#347dc4]" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">
                    {calculationMode === 'total' && 'Total Value'}
                    {calculationMode === 'private' && 'Private Event Value'}
                    {calculationMode === 'company' && 'Company Value'}
                    {calculationMode === 'expected' && 'Expected Value'}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${Math.round(currentStats.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-[#347dc4]" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Open Opportunities</p>
                  <p className="text-2xl font-semibold text-gray-900">{openOpportunities}</p>
                  {calculationMode === 'expected' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Based on probability-weighted values
                      {settings.opportunities?.autoCalculateProbability ? ' (stage-based)' : ' (individual)'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search - Only show on table and card views */}
          {currentView !== 'pipeline' && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="opportunity-search"
                    name="opportunity-search"
                    type="text"
                    placeholder="Search opportunities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#347dc4] focus:border-transparent"
                  />
                </div>
              </div>
                <div className="flex gap-4">
                  <div className="min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Stage
                    </label>
                    <Select
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
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
                  
                  <div className="min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Date
                    </label>
                    <Select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
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
                  
                  <div className="min-w-[180px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Type
                    </label>
                    <Select
                      value={dateType}
                      onChange={(e) => setDateType(e.target.value as 'created' | 'closed')}
                    >
                      <option value="created">Created Date</option>
                      <option value="closed">Closed Date</option>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Toggle and Closed Buckets */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">All Opportunities</h3>
              <div className="flex items-center gap-4">
                {/* Closed Buckets - Only show in pipeline view */}
                {currentView === 'pipeline' && (
                  <div className="flex gap-3">
                    {/* Closed Won Bucket */}
                    <div
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${
                        dragOverStage === 'closed_won'
                          ? 'border-green-400 bg-green-50'
                          : 'border-green-300 bg-green-50 hover:bg-green-100'
                      }`}
                      onClick={() => setShowBucketPopup('won')}
                      onDragOver={(e) => handleDragOver(e, 'closed_won')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'closed_won')}
                    >
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <ThumbsUp className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-green-800">Closed Won</div>
                        <div className="text-green-600">
                          {opportunities.filter(opp => opp.stage === 'closed_won').length}
                        </div>
                      </div>
                    </div>

                    {/* Closed Lost Bucket */}
                    <div
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer ${
                        dragOverStage === 'closed_lost'
                          ? 'border-red-400 bg-red-50'
                          : 'border-red-300 bg-red-50 hover:bg-red-100'
                      }`}
                      onClick={() => setShowBucketPopup('lost')}
                      onDragOver={(e) => handleDragOver(e, 'closed_lost')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'closed_lost')}
                    >
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <ThumbsDown className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-red-800">Closed Lost</div>
                        <div className="text-red-600">
                          {opportunities.filter(opp => opp.stage === 'closed_lost').length}
                        </div>
                      </div>
                    </div>
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
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOpportunities.map((opportunity) => (
                    <tr 
                      key={opportunity.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => window.open(`/${tenantSubdomain}/opportunities/${opportunity.id}`, '_blank')}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-48" title={opportunity.name}>
                          {opportunity.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-48" title={opportunity.description || ''}>
                        {opportunity.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={opportunity.account_name || ''}>
                        {opportunity.account_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-32" title={opportunity.contact_name || ''}>
                        {opportunity.contact_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          opportunity.stage === 'prospecting' ? 'bg-blue-100 text-blue-800' :
                          opportunity.stage === 'qualification' ? 'bg-yellow-100 text-yellow-800' :
                          opportunity.stage === 'proposal' ? 'bg-purple-100 text-purple-800' :
                          opportunity.stage === 'negotiation' ? 'bg-orange-100 text-orange-800' :
                          opportunity.stage === 'closed_won' ? 'bg-green-100 text-green-800' :
                          opportunity.stage === 'closed_lost' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {opportunity.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getOpportunityProbability(opportunity)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${opportunity.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                              setSelectedOpportunity(opportunity)
                              setShowEmailModal(true)
                            }}
                            className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                            title="Send Email"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOpportunity(opportunity)
                              setShowSMSModal(true)
                            }}
                            className="text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150 active:scale-95"
                            title="Send SMS"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOpportunity(opportunity.id)
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
          </div>
          )}

          {/* Pipeline View */}
          {currentView === 'pipeline' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {/* Pipeline Stages - Exclude closed stages */}
                  {(settings.opportunities?.stages || [
                    { id: 'prospecting', name: 'Prospecting', enabled: true },
                    { id: 'qualification', name: 'Qualification', enabled: true },
                    { id: 'proposal', name: 'Proposal', enabled: true },
                    { id: 'negotiation', name: 'Negotiation', enabled: true },
                    { id: 'closed_won', name: 'Closed Won', enabled: true },
                    { id: 'closed_lost', name: 'Closed Lost', enabled: true }
                  ]).filter((stage: any) => stage.enabled !== false && !['closed_won', 'closed_lost'].includes(stage.id || stage)).map((stage: any) => {
                    const stageId = stage.id || stage
                    const stageName = stage.name || stage
                    const stageOpportunities = filteredOpportunities.filter(opp => opp.stage === stageId)
                    const stageValue = stageOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)
                    
                    return (
                      <div 
                        key={stageId} 
                        className={`bg-gray-50 rounded-lg p-4 transition-colors duration-200 ${
                          dragOverStage === stageId ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''
                        }`}
                        onDragOver={(e) => handleDragOver(e, stageId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, stageId)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {stageName}
                            </h3>
                            {settings.opportunities?.autoCalculateProbability && (
                              <p className="text-xs text-gray-500">
                                {(() => {
                                  const stageSettings = settings.opportunities.stages?.find((s: any) => s.id === stageId)
                                  return stageSettings ? `${stageSettings.probability}% probability` : ''
                                })()}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {stageOpportunities.length}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-4">
                          ${stageValue.toLocaleString()}
                        </div>
                        
                        <div className="space-y-3 min-h-[50px]">
                          {stageOpportunities.length === 0 && (
                            <div className="text-center text-gray-400 text-xs py-4 border-2 border-dashed border-gray-200 rounded-lg">
                              {dragOverStage === stage ? 'Drop here' : 'No opportunities'}
                            </div>
                          )}
                          {stageOpportunities.map((opportunity) => (
                            <div
                              key={opportunity.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, opportunity)}
                              onDragEnd={handleDragEnd}
                              onClick={() => window.open(`/${tenantSubdomain}/opportunities/${opportunity.id}`, '_blank')}
                              className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer relative group ${
                                draggedOpportunity?.id === opportunity.id ? 'opacity-50 scale-95 rotate-2' : ''
                              }`}
                            >
                              {/* Drag handle indicator */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              </div>
                              
                              <div className="text-sm font-medium text-gray-900 mb-1 truncate pr-4">
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
                                  {getOpportunityProbability(opportunity)}%
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
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Success Animations */}
          {showAnimation && (
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
              <div className={`absolute transition-all duration-1000 ease-out ${
                showAnimation === 'won' 
                  ? 'animate-bounce text-green-500' 
                  : 'animate-bounce text-red-500'
              }`}>
                {showAnimation === 'won' ? (
                  <div className="flex flex-col items-center">
                    <ThumbsUp className="w-16 h-16 mb-2" />
                    <div className="text-lg font-semibold text-green-600">Opportunity Won!</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ThumbsDown className="w-16 h-16 mb-2" />
                    <div className="text-lg font-semibold text-red-600">Opportunity Lost</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bucket Popup */}
          {showBucketPopup && (
            <div 
              className="fixed top-4 right-4 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[70vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      showBucketPopup === 'won' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {showBucketPopup === 'won' ? (
                        <ThumbsUp className="w-4 h-4 text-white" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {showBucketPopup === 'won' ? 'Closed Won' : 'Closed Lost'} ({opportunities.filter(opp => opp.stage === (showBucketPopup === 'won' ? 'closed_won' : 'closed_lost')).length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowBucketPopup(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  <div className="mb-3 text-xs text-gray-500">
                    Drag opportunities back to any stage to move them out of the closed status.
                  </div>
                  
                  <div className="space-y-2">
                    {opportunities
                      .filter(opp => opp.stage === (showBucketPopup === 'won' ? 'closed_won' : 'closed_lost'))
                      .map((opportunity) => (
                        <div
                          key={opportunity.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative group"
                          draggable
                          onDragStart={(e) => handleDragStart(e, opportunity)}
                          onDragEnd={() => setDraggedOpportunity(null)}
                          onClick={() => window.open(`/${tenantSubdomain}/opportunities/${opportunity.id}`, '_blank')}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-gray-600">
                                  {opportunity.account_name ? opportunity.account_name.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium text-gray-900 truncate">{opportunity.name}</h4>
                                <p className="text-xs text-gray-600 truncate">
                                  {opportunity.account_name} • ${opportunity.amount?.toLocaleString() || '0'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-500">
                              {getOpportunityProbability(opportunity)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    
                    {opportunities.filter(opp => opp.stage === (showBucketPopup === 'won' ? 'closed_won' : 'closed_lost')).length === 0 && (
                      <div className="text-center py-6 text-gray-500 text-sm">
                        No {showBucketPopup === 'won' ? 'won' : 'lost'} opportunities yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
          alert('Email sent successfully!')
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
          alert('SMS sent successfully!')
        }}
        opportunityId={selectedOpportunity?.id}
        accountId={selectedOpportunity?.account_id || undefined}
        contactId={selectedOpportunity?.contact_id || undefined}
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