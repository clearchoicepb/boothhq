import { useQuery } from '@tanstack/react-query'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  relationship_to_account: string | null
}

async function fetchAccountContacts(accountId: string): Promise<Contact[]> {
  const response = await fetch(`/api/contacts?account_id=${accountId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch contacts')
  }
  const data = await response.json()
  return data || []
}

/**
 * Fetches contacts for a specific account with automatic caching
 */
export function useAccountContacts(accountId: string) {
  return useQuery({
    queryKey: ['account-contacts', accountId],
    queryFn: () => fetchAccountContacts(accountId),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    enabled: Boolean(accountId),
  })
}
