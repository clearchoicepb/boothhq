/**
 * EventDetailContext
 *
 * Provides centralized state management for Event Detail page.
 * Consolidates multiple hooks to reduce prop drilling and improve maintainability.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { Event, EventDate, EventActivity, Communication } from '@/types/events'

// ============================================================================
// Modal State Interface
// ============================================================================

interface ModalState {
  // Create/Action modals
  isTaskModalOpen: boolean

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
}

// ============================================================================
// Detail Modal State Interface (selected items for detail modals)
// ============================================================================

interface DetailModalState {
  selectedCommunication: Communication | null
  selectedActivity: EventActivity | null
  selectedEventDate: EventDate | null
  showSMSThread: boolean
  /** Tab index for event dates card (0-based) */
  activeEventDateTab: number
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

  // Event Date editing (consolidated from useEventEditing hook)
  isEditingEventDate: boolean
  editEventDateData: Partial<EventDate>
}

// ============================================================================
// Modal Name Types
// ============================================================================

// All boolean modal properties (excludes refresh keys)
type ModalBooleanKeys =
  | 'isTaskModalOpen'
  | 'isLogCommunicationModalOpen'
  | 'isEmailModalOpen'
  | 'isSMSModalOpen'
  | 'isGenerateAgreementModalOpen'
  | 'isCommunicationDetailOpen'
  | 'isActivityDetailOpen'
  | 'isEventDateDetailOpen'

type RefreshKeyTypes = 'tasksKey'

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
  setSelectedCommunication: (communication: Communication | null) => void
  setSelectedActivity: (activity: EventActivity | null) => void
  setSelectedEventDate: (eventDate: EventDate | null) => void
  setShowSMSThread: (show: boolean) => void
  toggleSMSThread: () => void
  setActiveEventDateTab: (tab: number) => void
  triggerAttachmentsRefresh: () => void

  // Convenience methods for opening detail modals with data
  openCommunicationDetail: (communication: Communication) => void
  openActivityDetail: (activity: EventActivity) => void
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

  // Event Date editing (consolidated from useEventEditing hook)
  startEditEventDate: (eventDate: Partial<EventDate>) => void
  updateEditEventDateField: (field: string, value: string | null) => void
  cancelEditEventDate: () => void
  finishEditEventDate: () => void
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
    tasksKey: 0
  })

  // Detail modal state (selected items for detail modals)
  const [detailModals, setDetailModals] = useState<DetailModalState>({
    selectedCommunication: null,
    selectedActivity: null,
    selectedEventDate: null,
    showSMSThread: false,
    activeEventDateTab: 0,
    attachmentsRefreshTrigger: 0
  })

  // Editing state (consolidated - single source of truth for all editing)
  const [editing, setEditing] = useState<EditingState>({
    isEditingAccountContact: false,
    editAccountId: event?.account_id || '',
    editContactId: event?.primary_contact_id || '',
    editEventPlannerId: event?.event_planner_id || '',

    isEditingPaymentStatus: false,
    editPaymentStatus: event?.payment_status || '',

    isEditingDescription: false,
    editedDescription: event?.description || '',

    // Event Date editing (consolidated from useEventEditing hook)
    isEditingEventDate: false,
    editEventDateData: {}
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
  const setSelectedCommunication = (communication: Communication | null) => {
    setDetailModals(prev => ({ ...prev, selectedCommunication: communication }))
  }

  const setSelectedActivity = (activity: EventActivity | null) => {
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

  const setActiveEventDateTab = (tab: number) => {
    setDetailModals(prev => ({ ...prev, activeEventDateTab: tab }))
  }

  const triggerAttachmentsRefresh = () => {
    setDetailModals(prev => ({ ...prev, attachmentsRefreshTrigger: prev.attachmentsRefreshTrigger + 1 }))
  }

  // Convenience methods for opening detail modals with data
  const openCommunicationDetail = (communication: Communication) => {
    setDetailModals(prev => ({ ...prev, selectedCommunication: communication }))
    setModals(prev => ({ ...prev, isCommunicationDetailOpen: true }))
  }

  const openActivityDetail = (activity: EventActivity) => {
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

  // Event Date editing (consolidated from useEventEditing hook)
  const startEditEventDate = (eventDate: Partial<EventDate>) => {
    setEditing(prev => ({
      ...prev,
      isEditingEventDate: true,
      editEventDateData: eventDate
    }))
  }

  const updateEditEventDateField = (field: string, value: string | null) => {
    setEditing(prev => ({
      ...prev,
      editEventDateData: { ...prev.editEventDateData, [field]: value }
    }))
  }

  const cancelEditEventDate = () => {
    setEditing(prev => ({
      ...prev,
      isEditingEventDate: false,
      editEventDateData: {}
    }))
  }

  const finishEditEventDate = () => {
    setEditing(prev => ({
      ...prev,
      isEditingEventDate: false,
      editEventDateData: {}
    }))
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
    updateEditDescription,

    // Event Date editing
    startEditEventDate,
    updateEditEventDateField,
    cancelEditEventDate,
    finishEditEventDate
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
