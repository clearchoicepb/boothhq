/**
 * EventDetailContext
 *
 * Provides centralized state management for Event Detail page.
 * Consolidates multiple hooks to reduce prop drilling and improve maintainability.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { Event, EventDate } from '@/types/events'

// ============================================================================
// Modal State Interface
// ============================================================================

interface ModalState {
  // Create/Action modals
  isTaskModalOpen: boolean
  isDesignItemModalOpen: boolean
  isLogisticsModalOpen: boolean
  isCommunicationModalOpen: boolean
  isActivityModalOpen: boolean
  isInvoiceModalOpen: boolean
  isStaffModalOpen: boolean
  isDateModalOpen: boolean
  isAttachmentModalOpen: boolean

  // Communication modals (consolidated from page.tsx)
  isLogCommunicationModalOpen: boolean
  isEmailModalOpen: boolean
  isSMSModalOpen: boolean
  isGenerateAgreementModalOpen: boolean

  // Detail view modals
  isCommunicationDetailOpen: boolean
  isActivityDetailOpen: boolean
  isEventDateDetailOpen: boolean

  // Keys for forcing re-renders
  tasksKey: number
  designItemsKey: number
  logisticsKey: number
  communicationsKey: number
  activitiesKey: number
  invoicesKey: number
  staffKey: number
  datesKey: number
  attachmentsKey: number
}

// ============================================================================
// Detail Modal State Interface (selected items for detail modals)
// ============================================================================

interface DetailModalState {
  selectedCommunication: any | null
  selectedActivity: any | null
  selectedEventDate: EventDate | null
  showSMSThread: boolean
  activeEventDateTab: string
  attachmentsRefreshTrigger: number
}

// ============================================================================
// Editing State Interface
// ============================================================================

interface EditingState {
  isEditingAccountContact: boolean
  editAccountId: string
  editContactId: string
  editEventPlannerId: string

  isEditingPaymentStatus: boolean
  editPaymentStatus: string

  isEditingDescription: boolean
  editedDescription: string
}

// ============================================================================
// Modal Name Types
// ============================================================================

// All boolean modal properties (excludes refresh keys)
type ModalBooleanKeys =
  | 'isTaskModalOpen'
  | 'isDesignItemModalOpen'
  | 'isLogisticsModalOpen'
  | 'isCommunicationModalOpen'
  | 'isActivityModalOpen'
  | 'isInvoiceModalOpen'
  | 'isStaffModalOpen'
  | 'isDateModalOpen'
  | 'isAttachmentModalOpen'
  | 'isLogCommunicationModalOpen'
  | 'isEmailModalOpen'
  | 'isSMSModalOpen'
  | 'isGenerateAgreementModalOpen'
  | 'isCommunicationDetailOpen'
  | 'isActivityDetailOpen'
  | 'isEventDateDetailOpen'

type RefreshKeyTypes = 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey'

// ============================================================================
// Context Value Interface
// ============================================================================

interface EventDetailContextValue {
  // Event data
  event: Event | null
  eventDates: EventDate[]
  loading: boolean

  // Modal state
  modals: ModalState
  openModal: (modalName: ModalBooleanKeys) => void
  closeModal: (modalName: ModalBooleanKeys) => void
  refreshData: (dataType: RefreshKeyTypes) => void

  // Detail modal state (selected items)
  detailModals: DetailModalState
  setSelectedCommunication: (communication: any | null) => void
  setSelectedActivity: (activity: any | null) => void
  setSelectedEventDate: (eventDate: EventDate | null) => void
  setShowSMSThread: (show: boolean) => void
  toggleSMSThread: () => void
  setActiveEventDateTab: (tab: string) => void
  triggerAttachmentsRefresh: () => void

  // Convenience methods for opening detail modals with data
  openCommunicationDetail: (communication: any) => void
  openActivityDetail: (activity: any) => void
  openEventDateDetail: (eventDate: EventDate) => void

  // Editing state
  editing: EditingState
  startEditAccountContact: () => void
  saveEditAccountContact: (accountId: string, contactId: string, plannerId: string) => Promise<void>
  cancelEditAccountContact: () => void
  updateEditAccount: (accountId: string) => void
  updateEditContact: (contactId: string) => void
  updateEditPlanner: (plannerId: string) => void

  startEditPaymentStatus: () => void
  saveEditPaymentStatus: (status: string) => Promise<void>
  cancelEditPaymentStatus: () => void
  updateEditPaymentStatus: (status: string) => void

  startEditDescription: () => void
  saveEditDescription: (description: string) => Promise<void>
  cancelEditDescription: () => void
  updateEditDescription: (description: string) => void
}

// ============================================================================
// Context
// ============================================================================

const EventDetailContext = createContext<EventDetailContextValue | undefined>(undefined)

// ============================================================================
// Provider Props
// ============================================================================

interface EventDetailProviderProps {
  children: ReactNode
  event: Event | null
  eventDates: EventDate[]
  loading: boolean
  onEventUpdate?: () => void
}

// ============================================================================
// Provider Component
// ============================================================================

export function EventDetailProvider({
  children,
  event,
  eventDates = [],
  loading,
  onEventUpdate
}: EventDetailProviderProps) {
  // Ensure eventDates is always an array
  const safeEventDates = eventDates || []

  // Modal state
  const [modals, setModals] = useState<ModalState>({
    // Create/Action modals
    isTaskModalOpen: false,
    isDesignItemModalOpen: false,
    isLogisticsModalOpen: false,
    isCommunicationModalOpen: false,
    isActivityModalOpen: false,
    isInvoiceModalOpen: false,
    isStaffModalOpen: false,
    isDateModalOpen: false,
    isAttachmentModalOpen: false,
    // Communication modals
    isLogCommunicationModalOpen: false,
    isEmailModalOpen: false,
    isSMSModalOpen: false,
    isGenerateAgreementModalOpen: false,
    // Detail view modals
    isCommunicationDetailOpen: false,
    isActivityDetailOpen: false,
    isEventDateDetailOpen: false,
    // Refresh keys
    tasksKey: 0,
    designItemsKey: 0,
    logisticsKey: 0,
    communicationsKey: 0,
    activitiesKey: 0,
    invoicesKey: 0,
    staffKey: 0,
    datesKey: 0,
    attachmentsKey: 0
  })

  // Detail modal state (selected items for detail modals)
  const [detailModals, setDetailModals] = useState<DetailModalState>({
    selectedCommunication: null,
    selectedActivity: null,
    selectedEventDate: null,
    showSMSThread: false,
    activeEventDateTab: 'details',
    attachmentsRefreshTrigger: 0
  })

  // Editing state
  const [editing, setEditing] = useState<EditingState>({
    isEditingAccountContact: false,
    editAccountId: event?.account_id || '',
    editContactId: event?.primary_contact_id || '',
    editEventPlannerId: event?.event_planner_id || '',

    isEditingPaymentStatus: false,
    editPaymentStatus: event?.payment_status || '',

    isEditingDescription: false,
    editedDescription: event?.description || ''
  })

  // Modal actions
  const openModal = (modalName: ModalBooleanKeys) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
  }

  const closeModal = (modalName: ModalBooleanKeys) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

  const refreshData = (dataType: RefreshKeyTypes) => {
    setModals(prev => ({ ...prev, [dataType]: prev[dataType] + 1 }))
  }

  // Detail modal state setters
  const setSelectedCommunication = (communication: any | null) => {
    setDetailModals(prev => ({ ...prev, selectedCommunication: communication }))
  }

  const setSelectedActivity = (activity: any | null) => {
    setDetailModals(prev => ({ ...prev, selectedActivity: activity }))
  }

  const setSelectedEventDate = (eventDate: EventDate | null) => {
    setDetailModals(prev => ({ ...prev, selectedEventDate: eventDate }))
  }

  const setShowSMSThread = (show: boolean) => {
    setDetailModals(prev => ({ ...prev, showSMSThread: show }))
  }

  const toggleSMSThread = () => {
    setDetailModals(prev => ({ ...prev, showSMSThread: !prev.showSMSThread }))
  }

  const setActiveEventDateTab = (tab: string) => {
    setDetailModals(prev => ({ ...prev, activeEventDateTab: tab }))
  }

  const triggerAttachmentsRefresh = () => {
    setDetailModals(prev => ({ ...prev, attachmentsRefreshTrigger: prev.attachmentsRefreshTrigger + 1 }))
  }

  // Convenience methods for opening detail modals with data
  const openCommunicationDetail = (communication: any) => {
    setDetailModals(prev => ({ ...prev, selectedCommunication: communication }))
    setModals(prev => ({ ...prev, isCommunicationDetailOpen: true }))
  }

  const openActivityDetail = (activity: any) => {
    setDetailModals(prev => ({ ...prev, selectedActivity: activity }))
    setModals(prev => ({ ...prev, isActivityDetailOpen: true }))
  }

  const openEventDateDetail = (eventDate: EventDate) => {
    setDetailModals(prev => ({ ...prev, selectedEventDate: eventDate }))
    setModals(prev => ({ ...prev, isEventDateDetailOpen: true }))
  }

  // Account/Contact/Planner editing
  const startEditAccountContact = () => {
    setEditing(prev => ({
      ...prev,
      isEditingAccountContact: true,
      editAccountId: event?.account_id || '',
      editContactId: event?.primary_contact_id || '',
      editEventPlannerId: event?.event_planner_id || ''
    }))
  }

  const saveEditAccountContact = async (accountId: string, contactId: string, plannerId: string) => {
    // This will be implemented by the page component
    // For now, just update local state
    setEditing(prev => ({
      ...prev,
      isEditingAccountContact: false,
      editAccountId: accountId,
      editContactId: contactId,
      editEventPlannerId: plannerId
    }))
    onEventUpdate?.()
  }

  const cancelEditAccountContact = () => {
    setEditing(prev => ({
      ...prev,
      isEditingAccountContact: false,
      editAccountId: event?.account_id || '',
      editContactId: event?.primary_contact_id || '',
      editEventPlannerId: event?.event_planner_id || ''
    }))
  }

  const updateEditAccount = (accountId: string) => {
    setEditing(prev => ({ ...prev, editAccountId: accountId }))
  }

  const updateEditContact = (contactId: string) => {
    setEditing(prev => ({ ...prev, editContactId: contactId }))
  }

  const updateEditPlanner = (plannerId: string) => {
    setEditing(prev => ({ ...prev, editEventPlannerId: plannerId }))
  }

  // Payment status editing
  const startEditPaymentStatus = () => {
    setEditing(prev => ({
      ...prev,
      isEditingPaymentStatus: true,
      editPaymentStatus: event?.payment_status || ''
    }))
  }

  const saveEditPaymentStatus = async (status: string) => {
    setEditing(prev => ({
      ...prev,
      isEditingPaymentStatus: false,
      editPaymentStatus: status
    }))
    onEventUpdate?.()
  }

  const cancelEditPaymentStatus = () => {
    setEditing(prev => ({
      ...prev,
      isEditingPaymentStatus: false,
      editPaymentStatus: event?.payment_status || ''
    }))
  }

  const updateEditPaymentStatus = (status: string) => {
    setEditing(prev => ({ ...prev, editPaymentStatus: status }))
  }

  // Description editing
  const startEditDescription = () => {
    setEditing(prev => ({
      ...prev,
      isEditingDescription: true,
      editedDescription: event?.description || ''
    }))
  }

  const saveEditDescription = async (description: string) => {
    setEditing(prev => ({
      ...prev,
      isEditingDescription: false,
      editedDescription: description
    }))
    onEventUpdate?.()
  }

  const cancelEditDescription = () => {
    setEditing(prev => ({
      ...prev,
      isEditingDescription: false,
      editedDescription: event?.description || ''
    }))
  }

  const updateEditDescription = (description: string) => {
    setEditing(prev => ({ ...prev, editedDescription: description }))
  }

  const value: EventDetailContextValue = {
    // Event data
    event,
    eventDates: safeEventDates,
    loading,

    // Modal state
    modals,
    openModal,
    closeModal,
    refreshData,

    // Detail modal state
    detailModals,
    setSelectedCommunication,
    setSelectedActivity,
    setSelectedEventDate,
    setShowSMSThread,
    toggleSMSThread,
    setActiveEventDateTab,
    triggerAttachmentsRefresh,

    // Convenience methods for opening detail modals
    openCommunicationDetail,
    openActivityDetail,
    openEventDateDetail,

    // Editing state
    editing,
    startEditAccountContact,
    saveEditAccountContact,
    cancelEditAccountContact,
    updateEditAccount,
    updateEditContact,
    updateEditPlanner,

    startEditPaymentStatus,
    saveEditPaymentStatus,
    cancelEditPaymentStatus,
    updateEditPaymentStatus,

    startEditDescription,
    saveEditDescription,
    cancelEditDescription,
    updateEditDescription
  }

  return (
    <EventDetailContext.Provider value={value}>
      {children}
    </EventDetailContext.Provider>
  )
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access EventDetailContext
 *
 * @throws Error if used outside EventDetailProvider
 * @returns EventDetailContextValue
 *
 * @example
 * function EventOverviewTab() {
 *   const { event, modals, openModal, editing, startEditAccountContact } = useEventDetail()
 *   // Use context values...
 * }
 */
export function useEventDetail() {
  const context = useContext(EventDetailContext)

  if (context === undefined) {
    throw new Error('useEventDetail must be used within EventDetailProvider')
  }

  return context
}

// ============================================================================
// Exports
// ============================================================================

export type { EventDetailContextValue, ModalState, DetailModalState, EditingState, ModalBooleanKeys, RefreshKeyTypes }
export type { Event, EventDate } from '@/types/events'
