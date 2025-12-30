import { useQuery } from '@tanstack/react-query'
import type { Invoice } from '@/components/events/invoices/types'

async function fetchAccountInvoices(accountId: string, type: 'all' | 'upcoming' = 'all'): Promise<Invoice[]> {
  const response = await fetch(`/api/accounts/${accountId}/invoices?type=${type}`)
  if (!response.ok) {
    throw new Error('Failed to fetch invoices')
  }
  const data = await response.json()
  return data || []
}

/**
 * Fetches all invoices for an account (both event-linked and general)
 */
export function useAccountInvoices(accountId: string, type: 'all' | 'upcoming' = 'all') {
  return useQuery({
    queryKey: ['account-invoices', accountId, type],
    queryFn: () => fetchAccountInvoices(accountId, type),
    staleTime: 0, // Always fetch fresh data to ensure cache updates are visible
    enabled: Boolean(accountId),
  })
}

/**
 * Fetches only upcoming invoices for an account (for quick display)
 */
export function useAccountUpcomingInvoices(accountId: string) {
  return useAccountInvoices(accountId, 'upcoming')
}
