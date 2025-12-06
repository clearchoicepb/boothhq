import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Opportunity } from '@/lib/supabase-client'
import { useOpportunitiesList, useDeleteOpportunity } from './useOpportunitiesList'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('hooks')

export interface OpportunityWithRelations extends Opportunity {
  account_name: string | null
  account_type: 'individual' | 'company' | null
  contact_name: string | null
  owner_name?: string | null
  event_dates?: Array<{
    event_date: string
    start_time?: string | null
    end_time?: string | null
    location_id?: string | null
    notes?: string | null
  }>
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
  setOpportunities: (opportunities: OpportunityWithRelations[]) => void
  loading: boolean
  totalItems: number
  totalPages: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  fetchOpportunities: () => void
  handlePageChange: (page: number) => void
  handleDeleteOpportunity: (opportunityId: string) => Promise<void>
}

/**
 * Custom hook for managing opportunities data fetching and pagination
 * Now powered by React Query for better caching and performance
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
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(initialPage)

  // Use React Query hook for data fetching
  const { data, isLoading, refetch } = useOpportunitiesList({
    stage: filterStage,
    ownerId: filterOwner,
    currentView,
    page: currentPage,
    limit: itemsPerPage,
    enabled: Boolean(session && tenant)
  })

  // Use mutation hook for deletion
  const deleteMutation = useDeleteOpportunity()

  // Extract data from response
  const opportunities = data?.data ?? []
  const totalItems = data?.pagination?.total ?? 0
  const totalPages = data?.pagination?.totalPages ?? 0

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
        await deleteMutation.mutateAsync(opportunityId)
        toast.success('Opportunity deleted successfully')
      } catch (error: any) {
        log.error({ error }, 'Error deleting opportunity')
        toast.error(`Failed to delete opportunity: ${error.message || 'Unknown error'}`)
      }
    }
  }, [deleteMutation])

  // Manual setter for optimistic updates (used by drag-and-drop)
  const setOpportunities = useCallback((opportunities: OpportunityWithRelations[]) => {
    queryClient.setQueryData(
      ['opportunities-list', { stage: filterStage, ownerId: filterOwner, currentView, page: currentPage, limit: itemsPerPage }],
      (old: any) => {
        if (!old) return { data: opportunities, pagination: { page: currentPage, limit: itemsPerPage, total: opportunities.length, totalPages: 1 } }
        return { ...old, data: opportunities }
      }
    )
  }, [queryClient, filterStage, filterOwner, currentView, currentPage, itemsPerPage])

  // Refetch function for manual refreshes
  const fetchOpportunities = useCallback(() => {
    refetch()
  }, [refetch])

  return {
    opportunities,
    setOpportunities,
    loading: isLoading,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    fetchOpportunities,
    handlePageChange,
    handleDeleteOpportunity,
  }
}

