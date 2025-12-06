/**
 * EventDetailContext
 *
 * Provides centralized state management for Event Detail page.
 * Consolidates multiple hooks to reduce prop drilling and improve maintainability.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { EventDate } from '@/types/events'

// ============================================================================
// Types
// ============================================================================

interface Event {
  id: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  status: string
  account_id?: string
  primary_contact_id?: string
  event_planner_id?: string
  payment_status?: string
  location?: string
  [key: string]: any
}

// ============================================================================
// Modal State Interface
// ============================================================================

interface ModalState {
  isTaskModalOpen: boolean
  isDesignItemModalOpen: boolean
  isLogisticsModalOpen: boolean
  isCommunicationModalOpen: boolean
  isActivityModalOpen: boolean
  isInvoiceModalOpen: boolean
  isStaffModalOpen: boolean
  isDateModalOpen: boolean
  isAttachmentModalOpen: boolean

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
// Context Value Interface
// ============================================================================

interface EventDetailContextValue {
  // Event data
  event: Event | null
  eventDates: EventDate[]
  loading: boolean

  // Modal state
  modals: ModalState
  openModal: (modalName: keyof Omit<ModalState, 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey'>) => void
  closeModal: (modalName: keyof Omit<ModalState, 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey'>) => void
  refreshData: (dataType: 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey') => void

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
    isTaskModalOpen: false,
    isDesignItemModalOpen: false,
    isLogisticsModalOpen: false,
    isCommunicationModalOpen: false,
    isActivityModalOpen: false,
    isInvoiceModalOpen: false,
    isStaffModalOpen: false,
    isDateModalOpen: false,
    isAttachmentModalOpen: false,
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
  const openModal = (modalName: keyof Omit<ModalState, 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey'>) => {
    setModals(prev => ({ ...prev, [modalName]: true }))
  }

  const closeModal = (modalName: keyof Omit<ModalState, 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey'>) => {
    setModals(prev => ({ ...prev, [modalName]: false }))
  }

  const refreshData = (dataType: 'tasksKey' | 'designItemsKey' | 'logisticsKey' | 'communicationsKey' | 'activitiesKey' | 'invoicesKey' | 'staffKey' | 'datesKey' | 'attachmentsKey') => {
    setModals(prev => ({ ...prev, [dataType]: prev[dataType] + 1 }))
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

export type { EventDetailContextValue, ModalState, EditingState, Event, EventDate }
