import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Fetches all physical addresses for the tenant
 */
async function fetchPhysicalAddresses(): Promise<any[]> {
  const response = await fetch('/api/physical-addresses')
  if (!response.ok) {
    throw new Error('Failed to fetch physical addresses')
  }
  return response.json()
}

/**
 * Fetches physical addresses with React Query
 */
export function usePhysicalAddressesData() {
  return useQuery({
    queryKey: ['physical-addresses'],
    queryFn: fetchPhysicalAddresses,
    staleTime: 30 * 1000,
  })
}

/**
 * Add a new physical address mutation
 */
export function useAddPhysicalAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (addressData: any) => {
      const response = await fetch('/api/physical-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create physical address')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-addresses'] })
    }
  })
}

/**
 * Update a physical address mutation
 */
export function useUpdatePhysicalAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ addressId, addressData }: { addressId: string; addressData: any }) => {
      const response = await fetch(`/api/physical-addresses/${addressId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update physical address')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-addresses'] })
    }
  })
}

/**
 * Delete a physical address mutation
 */
export function useDeletePhysicalAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (addressId: string) => {
      const response = await fetch(`/api/physical-addresses/${addressId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to delete physical address')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-addresses'] })
    }
  })
}
