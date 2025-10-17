import { useState, useEffect, useCallback } from 'react'
import type { Opportunity } from '@/lib/supabase-client'

export interface OpportunityWithRelations extends Opportunity {
  account_name: string | null
  account_type: 'individual' | 'company' | null
  contact_name: string | null
  owner_name?: string | null
}

interface UseOpportunitiesDataProps {
  session: any
  tenant: any
  filterStage: string
  filterOwner: string
  currentView: 'table' | 'pipeline' | 'cards'
  currentPage: number
  itemsPerPage?: number
}

interface UseOpportunitiesDataReturn {
  opportunities: OpportunityWithRelations[]
  setOpportunities: React.Dispatch<React.SetStateAction<OpportunityWithRelations[]>>
  loading: boolean
  totalItems: number
  totalPages: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  fetchOpportunities: () => Promise<void>
  handlePageChange: (page: number) => void
  handleDeleteOpportunity: (opportunityId: string) => Promise<void>
}

/**
 * Custom hook for managing opportunities data fetching and pagination
 * 
 * @param props - Configuration for data fetching
 * @returns Opportunities data, loading state, pagination, and data management functions
 */
export function useOpportunitiesData({
  session,
  tenant,
  filterStage,
  filterOwner,
  currentView,
  currentPage: initialPage,
  itemsPerPage = 25,
}: UseOpportunitiesDataProps): UseOpportunitiesDataReturn {
  const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)

      // Build query params based on current view
      const params = new URLSearchParams({
        stage: filterStage,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })

      // Add owner filter if selected
      if (filterOwner && filterOwner !== 'all') {
        params.append('owner_id', filterOwner)
      }

      // For pipeline view, only fetch active opportunities
      if (currentView === 'pipeline') {
        params.append('pipelineView', 'true')
      }

      // Include converted opportunities (so closed_won opportunities that were converted to events still show)
      params.append('include_converted', 'true')

      const response = await fetch(`/api/entities/opportunities?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()

        // Handle paginated response
        if (result.data && result.pagination) {
          setOpportunities(result.data)
          setTotalItems(result.pagination.total)
          setTotalPages(result.pagination.totalPages)
        } else {
          // Fallback for non-paginated response
          setOpportunities(result)
        }
      }
      
      // Update last fetch timestamp
      setLastFetchTime(Date.now())
    } catch (error) {
      console.error('Error fetching opportunities:', error)
    } finally {
      setLoading(false)
    }
  }, [filterStage, filterOwner, currentView, currentPage, itemsPerPage])

  // Fetch opportunities when dependencies change
  useEffect(() => {
    if (session && tenant) {
      fetchOpportunities()
    }
  }, [session, tenant, fetchOpportunities])

  // Auto-refresh on window focus/visibility change (for when user returns from settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refetch if:
      // 1. Page is visible
      // 2. User is authenticated
      // 3. More than 3 seconds since last fetch (prevent excessive calls)
      if (
        !document.hidden &&
        session &&
        tenant &&
        Date.now() - lastFetchTime > 3000
      ) {
        fetchOpportunities()
      }
    }

    const handleWindowFocus = () => {
      // Only refetch if more than 3 seconds since last fetch
      if (session && tenant && Date.now() - lastFetchTime > 3000) {
        fetchOpportunities()
      }
    }

    // Listen for visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Listen for window focus (returning from another window/app)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [session, tenant, lastFetchTime, fetchOpportunities])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Handle opportunity deletion
  const handleDeleteOpportunity = useCallback(async (opportunityId: string) => {
    if (confirm('Are you sure you want to delete this opportunity?')) {
      try {
        const response = await fetch(`/api/opportunities/${opportunityId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setOpportunities(prev => prev.filter(opportunity => opportunity.id !== opportunityId))
          alert('Opportunity deleted successfully')
        } else {
          const error = await response.json()
          alert(`Failed to delete opportunity: ${error.error || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error deleting opportunity:', error)
        alert('Failed to delete opportunity. Please try again.')
      }
    }
  }, [])

  return {
    opportunities,
    setOpportunities,
    loading,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    fetchOpportunities,
    handlePageChange,
    handleDeleteOpportunity,
  }
}

