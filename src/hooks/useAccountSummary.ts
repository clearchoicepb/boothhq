import { useQuery } from '@tanstack/react-query'

interface AccountSummary {
  totalSpend: number
  totalUpcomingInvoices: number
  contactCount: number
  totalEvents: number
}

async function fetchAccountSummary(accountId: string): Promise<AccountSummary> {
  const response = await fetch(`/api/accounts/${accountId}/summary`)
  if (!response.ok) {
    throw new Error('Failed to fetch account summary')
  }
  return response.json()
}

/**
 * Fetches summary statistics for an account
 */
export function useAccountSummary(accountId: string) {
  return useQuery({
    queryKey: ['account-summary', accountId],
    queryFn: () => fetchAccountSummary(accountId),
    staleTime: 60 * 1000,
    enabled: Boolean(accountId),
  })
}
