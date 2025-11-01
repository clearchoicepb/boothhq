import { useState, useMemo, useCallback } from 'react'
import type { OpportunityWithRelations } from './useOpportunitiesData'
import toast from 'react-hot-toast'

interface DateRange {
  start: Date
  end: Date
}

interface UseOpportunityFiltersReturn {
  filteredOpportunities: OpportunityWithRelations[]
}

interface UseOpportunityFiltersParams {
  opportunities: OpportunityWithRelations[]
  searchTerm: string
  filterStage: string
  filterOwner: string
  dateFilter: string
  dateType: 'created' | 'closed' | 'event'
}

/**
 * Get date range for a given filter option
 */
function getDateRange(filter: string): DateRange | null {
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

/**
 * Check if opportunity is in the date range
 */
function isOpportunityInDateRange(
  opportunity: OpportunityWithRelations, 
  filter: string, 
  dateType: 'created' | 'closed' | 'event'
): boolean {
  if (filter === 'all') return true
  
  const dateRange = getDateRange(filter)
  if (!dateRange) return true
  
  let opportunityDate: Date | null = null
  
  if (dateType === 'created') {
    opportunityDate = new Date(opportunity.created_at)
  } else if (dateType === 'closed') {
    opportunityDate = opportunity.actual_close_date ? new Date(opportunity.actual_close_date) : null
  } else if (dateType === 'event') {
    // Get first event date from event_dates array or fallback to event_date field
    const firstEventDate = (opportunity as any).event_dates?.[0]?.event_date || (opportunity as any).event_date
    opportunityDate = firstEventDate ? new Date(firstEventDate) : null
  }
  
  if (!opportunityDate) return false
  
  return opportunityDate >= dateRange.start && opportunityDate <= dateRange.end
}

/**
 * Custom hook for managing opportunity filters
 *
 * NOTE: Stage and Owner filtering are now done server-side for better performance.
 * This hook only applies client-side filters for search term and date range.
 *
 * @param params - Filter parameters
 * @returns Filtered opportunities
 */
export function useOpportunityFilters({
  opportunities,
  searchTerm,
  filterStage,
  filterOwner,
  dateFilter,
  dateType
}: UseOpportunityFiltersParams): UseOpportunityFiltersReturn {
  // Filter opportunities based on CLIENT-SIDE filter criteria only
  // (Stage and Owner are filtered server-side via API)
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opportunity => {
      // Search filter (client-side only)
      const matchesSearch = !searchTerm ||
                           opportunity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (opportunity.description && opportunity.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (opportunity.account_name && opportunity.account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (opportunity.contact_name && opportunity.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Date filter (client-side only)
      const matchesDate = isOpportunityInDateRange(opportunity, dateFilter, dateType)

      // Note: Stage and Owner filters are applied server-side, so we don't filter here
      // The opportunities array already has the correct stage/owner filtering applied

      return matchesSearch && matchesDate
    })
  }, [opportunities, searchTerm, dateFilter, dateType])

  return {
    filteredOpportunities,
  }
}

