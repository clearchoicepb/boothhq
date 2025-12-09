import { useQuery } from '@tanstack/react-query'

interface QuoteLineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unit_price: number
  total: number
}

interface Quote {
  id: string
  quote_number: string
  title: string | null
  opportunity_id: string | null
  account_id: string | null
  contact_id: string | null
  issue_date: string
  valid_until: string | null
  status: string
  subtotal: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  notes: string | null
  terms: string | null
  opportunity_name: string | null
  account_name: string | null
  contact_name: string | null
  line_items: QuoteLineItem[]
  invoice_id: string | null
  created_at: string
  updated_at: string
}

async function fetchQuote(quoteId: string): Promise<Quote> {
  const response = await fetch(`/api/quotes/${quoteId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch quote')
  }
  return response.json()
}

/**
 * Fetches quote details with automatic caching and background refetching
 */
export function useQuote(quoteId: string) {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => fetchQuote(quoteId),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    enabled: Boolean(quoteId),
  })
}
