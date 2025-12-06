import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('hooks')

export interface InventoryItemsFilter {
  // Pagination
  page?: number
  limit?: number

  // Sorting
  sort?: string
  order?: 'asc' | 'desc'

  // Filters
  category?: string
  tracking_type?: string
  assigned_to_type?: string
  assigned_to_id?: string
  status?: string
  search?: string

  // Value range
  min_value?: number
  max_value?: number

  // Date range
  purchase_date_from?: string
  purchase_date_to?: string
}

export interface InventoryItemsResponse {
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * Fetches all inventory items for the tenant with optional filters and pagination
 */
async function fetchInventoryItems(filters?: InventoryItemsFilter): Promise<InventoryItemsResponse> {
  const params = new URLSearchParams()

  // Pagination
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  // Sorting
  if (filters?.sort) params.append('sort', filters.sort)
  if (filters?.order) params.append('order', filters.order)

  // Filters
  if (filters?.category) params.append('category', filters.category)
  if (filters?.tracking_type) params.append('tracking_type', filters.tracking_type)
  if (filters?.assigned_to_type) params.append('assigned_to_type', filters.assigned_to_type)
  if (filters?.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)

  // Value range
  if (filters?.min_value !== undefined) params.append('min_value', filters.min_value.toString())
  if (filters?.max_value !== undefined) params.append('max_value', filters.max_value.toString())

  // Date range
  if (filters?.purchase_date_from) params.append('purchase_date_from', filters.purchase_date_from)
  if (filters?.purchase_date_to) params.append('purchase_date_to', filters.purchase_date_to)

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
      toast.success('Inventory item created')
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to create inventory item')
      toast.error(error.message || 'Failed to create inventory item')
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
      // Also invalidate product groups cache since item membership may have changed
      queryClient.invalidateQueries({ queryKey: ['product-groups'] })
      toast.success('Inventory item updated')
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to update inventory item')
      toast.error(error.message || 'Failed to update inventory item')
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
      toast.success('Inventory item deleted')
    },
    onError: (error: Error) => {
      log.error({ error }, 'Failed to delete inventory item')
      toast.error(error.message || 'Failed to delete inventory item')
    }
  })
}
