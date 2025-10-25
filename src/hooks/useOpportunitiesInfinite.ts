/**
 * React Query infinite query for opportunities list
 * Enables "Load More" button or infinite scroll functionality
 *
 * Benefits:
 * - Loads data in pages/chunks (better performance)
 * - Keeps all previous pages in cache
 * - Automatic loading states for initial load and "load more"
 * - Built-in pagination logic
 */

import { useInfiniteQuery } from '@tanstack/react-query'

interface OpportunitiesResponse {
  opportunities: any[]
  nextCursor?: number
  hasMore: boolean
  total: number
}

async function fetchOpportunities(
  pageParam: number = 0,
  filters?: {
    stage?: string
    owner_id?: string
    search?: string
  }
): Promise<OpportunitiesResponse> {
  const params = new URLSearchParams({
    offset: pageParam.toString(),
    limit: '20', // Load 20 at a time
    ...(filters?.stage && { stage: filters.stage }),
    ...(filters?.owner_id && { owner_id: filters.owner_id }),
    ...(filters?.search && { search: filters.search }),
  })

  const response = await fetch(`/api/opportunities?${params}`)
  if (!response.ok) throw new Error('Failed to fetch opportunities')

  const data = await response.json()

  return {
    opportunities: data,
    nextCursor: data.length === 20 ? pageParam + 20 : undefined,
    hasMore: data.length === 20,
    total: data.length
  }
}

export function useOpportunitiesInfinite(filters?: {
  stage?: string
  owner_id?: string
  search?: string
}) {
  return useInfiniteQuery({
    queryKey: ['opportunities-infinite', filters],
    queryFn: ({ pageParam = 0 }) => fetchOpportunities(pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Usage Example:
 *
 * function OpportunitiesList({ stage }) {
 *   const {
 *     data,
 *     isLoading,
 *     isFetchingNextPage,
 *     hasNextPage,
 *     fetchNextPage
 *   } = useOpportunitiesInfinite({ stage })
 *
 *   if (isLoading) return <LoadingSpinner />
 *
 *   // Flatten all pages into single array
 *   const allOpportunities = data?.pages.flatMap(page => page.opportunities) ?? []
 *
 *   return (
 *     <div>
 *       {allOpportunities.map(opp => (
 *         <OpportunityCard key={opp.id} opportunity={opp} />
 *       ))}
 *
 *       {hasNextPage && (
 *         <button
 *           onClick={() => fetchNextPage()}
 *           disabled={isFetchingNextPage}
 *         >
 *           {isFetchingNextPage ? 'Loading...' : 'Load More'}
 *         </button>
 *       )}
 *     </div>
 *   )
 * }
 *
 * Benefits:
 * ✅ Load data incrementally (better UX for large lists)
 * ✅ Previous pages stay cached (instant scroll back up)
 * ✅ Built-in "hasNextPage" and "fetchNextPage"
 * ✅ Easy to implement infinite scroll with IntersectionObserver
 */
