import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface InventoryItemsFilter {
  category?: string
  tracking_type?: string
  assigned_to_type?: string
  assigned_to_id?: string
}

/**
 * Fetches all inventory items for the tenant with optional filters
 */
async function fetchInventoryItems(filters?: InventoryItemsFilter): Promise<any[]> {
  const params = new URLSearchParams()
  if (filters?.category) params.append('category', filters.category)
  if (filters?.tracking_type) params.append('tracking_type', filters.tracking_type)
  if (filters?.assigned_to_type) params.append('assigned_to_type', filters.assigned_to_type)
  if (filters?.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id)

  const queryString = params.toString()
  const url = `/api/inventory-items${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch inventory items')
  }
  return response.json()
}

/**
 * Fetches a single inventory item
 */
async function fetchInventoryItem(itemId: string): Promise<any> {
  const response = await fetch(`/api/inventory-items/${itemId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch inventory item')
  }
  return response.json()
}

/**
 * Fetches inventory items with React Query
 */
export function useInventoryItemsData(filters?: InventoryItemsFilter) {
  return useQuery({
    queryKey: ['inventory-items', filters],
    queryFn: () => fetchInventoryItems(filters),
    staleTime: 30 * 1000,
  })
}

/**
 * Fetches a single inventory item with React Query
 */
export function useInventoryItemData(itemId: string) {
  return useQuery({
    queryKey: ['inventory-items', itemId],
    queryFn: () => fetchInventoryItem(itemId),
    staleTime: 30 * 1000,
    enabled: Boolean(itemId),
  })
}

/**
 * Add a new inventory item mutation
 */
export function useAddInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch('/api/inventory-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create inventory item')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

/**
 * Update an inventory item mutation
 */
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, itemData }: { itemId: string; itemData: any }) => {
      const response = await fetch(`/api/inventory-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update inventory item')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items', variables.itemId] })
    }
  })
}

/**
 * Delete an inventory item mutation
 */
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/inventory-items/${itemId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete inventory item')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}
