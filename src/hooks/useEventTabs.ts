import { useState, useCallback } from 'react'
import { useEventInvoices } from './useEventInvoices'
import { useEventActivities } from './useEventActivities'
import { useEventAttachments } from './useEventAttachments'
import { useEventCommunications } from './useEventCommunications'

/**
 * Custom hook for managing event tab navigation and tab-specific data loading
 * Now powered by React Query for automatic caching and parallel queries
 *
 * @param eventId - The ID of the event
 * @param session - The user session object (now optional)
 * @param tenant - The tenant object (now optional)
 * @returns Tab state, data, and functions
 */
export function useEventTabs(
  eventId: string,
  session?: any,
  tenant?: any
) {
  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Pagination
  const [communicationsPage, setCommunicationsPage] = useState(1)

  // Use React Query hooks - data loads automatically based on enabled state
  const invoicesQuery = useEventInvoices(eventId)
  const activitiesQuery = useEventActivities(eventId)
  const attachmentsQuery = useEventAttachments(eventId)
  const communicationsQuery = useEventCommunications(eventId, communicationsPage)

  /**
   * Refetch data for the current active tab
   */
  const refetchActiveTab = useCallback(() => {
    if (activeTab === 'invoices') {
      invoicesQuery.refetch()
    } else if (activeTab === 'activity') {
      activitiesQuery.refetch()
    } else if (activeTab === 'files') {
      attachmentsQuery.refetch()
    } else if (activeTab === 'communications') {
      communicationsQuery.refetch()
    }
  }, [activeTab, invoicesQuery, activitiesQuery, attachmentsQuery, communicationsQuery])

  /**
   * Change active tab
   */
  const changeTab = useCallback((tab: string) => {
    setActiveTab(tab)
  }, [])

  return {
    // Tab state
    activeTab,
    setActiveTab,
    changeTab,

    // Tab data (with fallback to empty arrays)
    invoices: invoicesQuery.data ?? [],
    activities: activitiesQuery.data ?? [],
    attachments: attachmentsQuery.data ?? [],
    communications: communicationsQuery.data ?? [],

    // Loading states
    loadingInvoices: invoicesQuery.isLoading,
    loadingActivities: activitiesQuery.isLoading,
    loadingAttachments: attachmentsQuery.isLoading,

    // Pagination
    communicationsPage,
    setCommunicationsPage,

    // Fetch functions (mapped to React Query refetch)
    fetchInvoices: invoicesQuery.refetch,
    fetchActivities: activitiesQuery.refetch,
    fetchAttachments: attachmentsQuery.refetch,
    fetchCommunications: communicationsQuery.refetch,
    refetchActiveTab,

    // Setters (for backward compatibility - now no-ops)
    setInvoices: () => {},
    setActivities: () => {},
    setAttachments: () => {},
    setCommunications: () => {},
  }
}

