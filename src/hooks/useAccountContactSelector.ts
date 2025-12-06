/**
 * Custom hook for managing account and contact selection
 * Encapsulates account/contact data fetching and selection state
 */

import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

interface Account {
  id: string
  name: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  account_id: string
}

interface UseAccountContactSelectorProps {
  opportunity?: any
  customer?: any
  enabled?: boolean
}

export function useAccountContactSelector({
  opportunity,
  customer,
  enabled = true
}: UseAccountContactSelectorProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Initialize from opportunity on mount
  useEffect(() => {
    if (opportunity && !customer && enabled) {
      setSelectedAccountId(opportunity.account_id || '')
      setSelectedContactId(opportunity.contact_id || '')
    }
  }, [opportunity?.id, customer, enabled])

  // Fetch accounts and contacts when enabled
  useEffect(() => {
    if (enabled && opportunity && !customer) {
      fetchAccounts()
    }
  }, [enabled, opportunity?.id, customer])

  // Refetch contacts when selected account changes
  useEffect(() => {
    if (enabled && !customer) {
      fetchContactsForAccount()
    }
  }, [selectedAccountId, enabled, customer])

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true)
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchContactsForAccount = async () => {
    if (!selectedAccountId) {
      setContacts([])
      return
    }

    try {
      setLoadingContacts(true)
      const response = await fetch(`/api/contacts?account_id=${selectedAccountId}`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching contacts for account')
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    // Reset contact when account changes
    setSelectedContactId('')
  }

  return {
    selectedAccountId,
    selectedContactId,
    accounts,
    contacts,
    loadingAccounts,
    loadingContacts,
    setSelectedAccountId: handleAccountChange,
    setSelectedContactId
  }
}
