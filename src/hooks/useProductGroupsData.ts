import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Fetches all product groups for the tenant
 */
async function fetchProductGroups(): Promise<any[]> {
  const response = await fetch('/api/product-groups')
  if (!response.ok) {
    throw new Error('Failed to fetch product groups')
  }
  return response.json()
}

/**
 * Fetches a single product group with its items
 */
async function fetchProductGroup(groupId: string): Promise<any> {
  const response = await fetch(`/api/product-groups/${groupId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch product group')
  }
  return response.json()
}

/**
 * Fetches product groups with React Query
 */
export function useProductGroupsData() {
  return useQuery({
    queryKey: ['product-groups'],
    queryFn: fetchProductGroups,
    staleTime: 30 * 1000,
  })
}

/**
 * Fetches a single product group with React Query
 */
export function useProductGroupData(groupId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['product-groups', groupId],
    queryFn: () => fetchProductGroup(groupId),
    staleTime: 30 * 1000,
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(groupId),
  })
}

/**
 * Add a new product group mutation
 */
export function useAddProductGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupData: any) => {
      const response = await fetch('/api/product-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create product group')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] })
    }
  })
}

/**
 * Update a product group mutation (cascades assignment to items)
 */
export function useUpdateProductGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, groupData }: { groupId: string; groupData: any }) => {
      const response = await fetch(`/api/product-groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product group')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] })
      queryClient.invalidateQueries({ queryKey: ['product-groups', variables.groupId] })
      // Also invalidate inventory items since they may have been updated
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

/**
 * Delete a product group mutation
 */
export function useDeleteProductGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/product-groups/${groupId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete product group')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

/**
 * Add item to product group mutation
 */
export function useAddItemToProductGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, inventoryItemId }: { groupId: string; inventoryItemId: string }) => {
      const response = await fetch(`/api/product-groups/${groupId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_item_id: inventoryItemId })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add item to product group')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] })
      queryClient.invalidateQueries({ queryKey: ['product-groups', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}

/**
 * Remove item from product group mutation
 */
export function useRemoveItemFromProductGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ groupId, inventoryItemId }: { groupId: string; inventoryItemId: string }) => {
      const response = await fetch(`/api/product-groups/${groupId}/items?inventory_item_id=${inventoryItemId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove item from product group')
      }
      return true
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-groups'] })
      queryClient.invalidateQueries({ queryKey: ['product-groups', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    }
  })
}
