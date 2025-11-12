import { useQuery } from '@tanstack/react-query'

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  due_date: string
  status: string
  events: {
    name: string
    event_date: string
  } | null
}

async function fetchAccountInvoices(accountId: string): Promise<Invoice[]> {
  const response = await fetch(`/api/accounts/${accountId}/invoices?type=upcoming`)
  if (!response.ok) {
    throw new Error('Failed to fetch invoices')
  }
  const data = await response.json()
  return data || []
}

/**
 * Fetches upcoming invoices for an account
 */
export function useAccountInvoices(accountId: string) {
  return useQuery({
    queryKey: ['account-invoices', accountId],
    queryFn: () => fetchAccountInvoices(accountId),
    staleTime: 0, // Always fetch fresh data to ensure cache updates are visible
    enabled: Boolean(accountId),
  })
}
