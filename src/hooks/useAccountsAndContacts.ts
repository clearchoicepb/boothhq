/**
 * React Query hooks for accounts and contacts data
 * Used for dropdowns and selection
 */

import { useQuery } from '@tanstack/react-query'

async function fetchAccounts() {
  const response = await fetch('/api/accounts')
  if (!response.ok) throw new Error('Failed to fetch accounts')
  return response.json()
}

async function fetchContacts(accountId?: string) {
  const url = accountId
    ? `/api/contacts?account_id=${accountId}`
    : '/api/contacts'
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch contacts')
  return response.json()
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes (relatively static data)
  })
}

export function useContacts(accountId?: string) {
  return useQuery({
    queryKey: ['contacts', accountId],
    queryFn: () => fetchContacts(accountId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: accountId !== undefined, // Only fetch if accountId is provided
  })
}
