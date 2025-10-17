import { useState, useCallback, useEffect } from 'react'

/**
 * Custom hook for managing event reference/dropdown data
 * (accounts, contacts, locations, payment status options)
 * 
 * @param session - The user session object
 * @param tenantSubdomain - The tenant subdomain for routing
 * @returns Reference data and refetch functions
 */
export function useEventReferences(
  session: any,
  tenantSubdomain: string
) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [paymentStatusOptions, setPaymentStatusOptions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  /**
   * Fetch accounts and contacts for dropdowns
   */
  const fetchAccountsAndContacts = useCallback(async () => {
    try {
      const [accountsRes, contactsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/contacts')
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData)
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        setContacts(contactsData)
      }
    } catch (error) {
      console.error('Error fetching accounts and contacts:', error)
    }
  }, [])

  /**
   * Fetch locations for event date assignment
   */
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations')
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations')
      }
      
      const data = await response.json()
      setLocations(data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }, [])

  /**
   * Fetch payment status options for dropdown
   */
  const fetchPaymentStatusOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/payment-status-options')
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment status options')
      }
      
      const data = await response.json()
      setPaymentStatusOptions(data)
    } catch (error) {
      console.error('Error fetching payment status options:', error)
    }
  }, [])

  /**
   * Fetch all reference data at once
   */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchAccountsAndContacts(),
        fetchLocations(),
        fetchPaymentStatusOptions()
      ])
    } finally {
      setLoading(false)
    }
  }, [fetchAccountsAndContacts, fetchLocations, fetchPaymentStatusOptions])

  /**
   * Refetch all reference data
   */
  const refetch = useCallback(() => {
    fetchAll()
  }, [fetchAll])

  /**
   * Initial data fetch on mount
   */
  useEffect(() => {
    if (session) {
      fetchAll()
    }
  }, [fetchAll, session])

  return {
    // Data
    accounts,
    contacts,
    locations,
    paymentStatusOptions,
    loading,
    
    // Individual fetch functions
    fetchAccountsAndContacts,
    fetchLocations,
    fetchPaymentStatusOptions,
    
    // Batch operations
    fetchAll,
    refetch,
  }
}

