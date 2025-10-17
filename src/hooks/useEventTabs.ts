import { useState, useCallback, useEffect } from 'react'

/**
 * Custom hook for managing event tab navigation and tab-specific data loading
 * 
 * @param eventId - The ID of the event
 * @param session - The user session object
 * @param tenant - The tenant object
 * @returns Tab state, data, and functions
 */
export function useEventTabs(
  eventId: string,
  session: any,
  tenant: any
) {
  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Tab-specific data
  const [invoices, setInvoices] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [communications, setCommunications] = useState<any[]>([])

  // Loading states
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  // Pagination
  const [communicationsPage, setCommunicationsPage] = useState(1)

  /**
   * Fetch invoices for the event
   */
  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true)
      const response = await fetch(`/api/invoices?event_id=${eventId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }
      
      const data = await response.json()
      setInvoices(data)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }, [eventId])

  /**
   * Fetch activities for the event
   */
  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true)
      const response = await fetch(`/api/events/${eventId}/activity`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }
      
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }, [eventId])

  /**
   * Fetch attachments for the event
   */
  const fetchAttachments = useCallback(async () => {
    try {
      setLoadingAttachments(true)
      const response = await fetch(`/api/attachments?entity_type=event&entity_id=${eventId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch attachments')
      }
      
      const data = await response.json()
      setAttachments(data)
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }, [eventId])

  /**
   * Fetch communications for the event
   */
  const fetchCommunications = useCallback(async () => {
    try {
      const response = await fetch(`/api/communications?event_id=${eventId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch communications')
      }
      
      const data = await response.json()
      setCommunications(data)
    } catch (error) {
      console.error('Error fetching communications:', error)
    }
  }, [eventId])

  /**
   * Refetch data for the current active tab
   */
  const refetchActiveTab = useCallback(() => {
    if (activeTab === 'invoices') {
      fetchInvoices()
    } else if (activeTab === 'activity') {
      fetchActivities()
    } else if (activeTab === 'files') {
      fetchAttachments()
    } else if (activeTab === 'communications') {
      fetchCommunications()
    }
  }, [activeTab, fetchInvoices, fetchActivities, fetchAttachments, fetchCommunications])

  /**
   * Change active tab and fetch data if needed
   */
  const changeTab = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [])

  /**
   * Auto-fetch data when tab changes
   */
  useEffect(() => {
    if (session && tenant && eventId) {
      if (activeTab === 'invoices') {
        fetchInvoices()
      } else if (activeTab === 'activity') {
        fetchActivities()
      } else if (activeTab === 'files') {
        fetchAttachments()
      } else if (activeTab === 'communications') {
        fetchCommunications()
      }
    }
  }, [activeTab, session, tenant, eventId, fetchInvoices, fetchActivities, fetchAttachments, fetchCommunications])

  return {
    // Tab state
    activeTab,
    setActiveTab,
    changeTab,

    // Tab data
    invoices,
    activities,
    attachments,
    communications,

    // Loading states
    loadingInvoices,
    loadingActivities,
    loadingAttachments,

    // Pagination
    communicationsPage,
    setCommunicationsPage,

    // Fetch functions
    fetchInvoices,
    fetchActivities,
    fetchAttachments,
    fetchCommunications,
    refetchActiveTab,

    // Setters (for advanced use cases)
    setInvoices,
    setActivities,
    setAttachments,
    setCommunications,
  }
}

