import { useQuery } from '@tanstack/react-query'

/**
 * Fetches all item categories (predefined, not tenant-specific)
 */
async function fetchItemCategories(): Promise<any[]> {
  const response = await fetch('/api/item-categories')
  if (!response.ok) {
    throw new Error('Failed to fetch item categories')
  }
  return response.json()
}

/**
 * Fetches item categories with React Query
 */
export function useItemCategoriesData() {
  return useQuery({
    queryKey: ['item-categories'],
    queryFn: fetchItemCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
  })
}
