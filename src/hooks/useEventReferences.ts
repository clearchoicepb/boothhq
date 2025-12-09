import { useQuery } from '@tanstack/react-query'

/**
 * Fetch accounts
 */
async function fetchAccounts(): Promise<any[]> {
  const response = await fetch('/api/accounts')
  if (!response.ok) {
    throw new Error('Failed to fetch accounts')
  }
  return response.json()
}

/**
 * Fetch contacts
 */
async function fetchContacts(): Promise<any[]> {
  const response = await fetch('/api/contacts')
  if (!response.ok) {
    throw new Error('Failed to fetch contacts')
  }
  return response.json()
}

/**
 * Fetch locations
 */
async function fetchLocations(): Promise<any[]> {
  const response = await fetch('/api/locations')
  if (!response.ok) {
    throw new Error('Failed to fetch locations')
  }
  return response.json()
}

/**
 * Fetch payment status options
 */
async function fetchPaymentStatusOptions(): Promise<any[]> {
  const response = await fetch('/api/payment-status-options')
  if (!response.ok) {
    throw new Error('Failed to fetch payment status options')
  }
  return response.json()
}

/**
 * Custom hook for managing event reference/dropdown data
 * Now powered by React Query for automatic caching and parallel fetching
 *
 * @param tenantSubdomain - The tenant subdomain for routing (now optional)
 * @returns Reference data and refetch functions
 */
export function useEventReferences(tenantSubdomain?: string) {
  // Use React Query hooks - all queries run in parallel automatically
  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 2 * 60 * 1000, // 2 minutes - reference data doesn't change often
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: fetchContacts,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const paymentStatusQuery = useQuery({
    queryKey: ['payment-status-options'],
    queryFn: fetchPaymentStatusOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes - rarely changes
    gcTime: 10 * 60 * 1000,
  })

  /**
   * Fetch accounts and contacts (legacy function for backward compatibility)
   */
  const fetchAccountsAndContacts = async () => {
    await Promise.all([
      accountsQuery.refetch(),
      contactsQuery.refetch()
    ])
  }

  /**
   * Fetch all reference data at once
   */
  const fetchAll = async () => {
    await Promise.all([
      accountsQuery.refetch(),
      contactsQuery.refetch(),
      locationsQuery.refetch(),
      paymentStatusQuery.refetch()
    ])
  }

  return {
    // Data (with fallbacks)
    accounts: accountsQuery.data ?? [],
    contacts: contactsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    paymentStatusOptions: paymentStatusQuery.data ?? [],
    loading: accountsQuery.isLoading || contactsQuery.isLoading || locationsQuery.isLoading || paymentStatusQuery.isLoading,

    // Individual fetch functions (mapped to React Query refetch)
    fetchAccountsAndContacts,
    fetchLocations: locationsQuery.refetch,
    fetchPaymentStatusOptions: paymentStatusQuery.refetch,

    // Batch operations
    fetchAll,
    refetch: fetchAll,
  }
}


