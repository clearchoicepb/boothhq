import { useQuery } from '@tanstack/react-query'

interface ContactWithRole {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  relationship_to_account: string | null
  role?: string | null
  is_primary?: boolean
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  junction_id?: string
}

interface Opportunity {
  id: string
  name: string
  stage: string
  amount: number | null
  expected_close_date: string | null
}

interface Account {
  id: string
  name: string
  account_type: 'individual' | 'company'
  email: string | null
  phone: string | null
  business_url: string | null
  photo_url: string | null
  billing_address: any | null
  shipping_address: any | null
  status: string
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  all_contacts?: ContactWithRole[]
  active_contacts?: ContactWithRole[]
  former_contacts?: ContactWithRole[]
  primary_contact?: ContactWithRole | null
  opportunities?: Opportunity[]
  events?: any[]
}

async function fetchAccount(accountId: string): Promise<Account> {
  const response = await fetch(`/api/accounts/${accountId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch account')
  }
  return response.json()
}

/**
 * Fetches account details with automatic caching and background refetching
 */
export function useAccount(accountId: string) {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: () => fetchAccount(accountId),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    enabled: Boolean(accountId),
  })
}
