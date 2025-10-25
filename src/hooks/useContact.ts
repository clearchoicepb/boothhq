import { useQuery } from '@tanstack/react-query'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  department: string | null
  relationship_to_account: string | null
  address: any | null
  avatar_url: string | null
  status: string
  assigned_to: string | null
  notes: string | null
  account_id: string | null
  account_name: string | null
  created_at: string
  updated_at: string
  all_accounts?: Array<{
    id: string
    name: string
    account_type?: string
    role: string
    is_primary: boolean
    start_date?: string
    end_date?: string | null
    junction_id: string
  }>
  active_accounts?: Array<any>
  former_accounts?: Array<any>
  primary_account?: any
}

async function fetchContact(contactId: string): Promise<Contact> {
  const response = await fetch(`/api/contacts/${contactId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch contact')
  }
  return response.json()
}

/**
 * Fetches contact details with automatic caching and background refetching
 */
export function useContact(contactId: string) {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => fetchContact(contactId),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    enabled: Boolean(contactId),
  })
}
