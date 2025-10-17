import { useState, useCallback } from 'react'
import { EventDate } from './useEventData'

/**
 * Custom hook for centralized modal state management
 * Manages all modal open/close states and selected items
 * 
 * @returns Modal states and control functions
 */
export function useEventModals() {
  // Task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [tasksKey, setTasksKey] = useState(0)

  // Communication modals
  const [isLogCommunicationModalOpen, setIsLogCommunicationModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false)

  // Detail modals with selected items
  const [selectedCommunication, setSelectedCommunication] = useState<any>(null)
  const [isCommunicationDetailOpen, setIsCommunicationDetailOpen] = useState(false)

  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [isActivityDetailOpen, setIsActivityDetailOpen] = useState(false)

  const [selectedEventDate, setSelectedEventDate] = useState<EventDate | null>(null)
  const [isEventDateDetailOpen, setIsEventDateDetailOpen] = useState(false)
  const [activeEventDateTab, setActiveEventDateTab] = useState(0)

  /**
   * Task Modal Controls
   */
  const openTaskModal = useCallback(() => {
    setIsTaskModalOpen(true)
  }, [])

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false)
  }, [])

  const refreshTasks = useCallback(() => {
    setTasksKey(prev => prev + 1)
  }, [])

  /**
   * Communication Modal Controls
   */
  const openLogCommunicationModal = useCallback(() => {
    setIsLogCommunicationModalOpen(true)
  }, [])

  const closeLogCommunicationModal = useCallback(() => {
    setIsLogCommunicationModalOpen(false)
  }, [])

  const openEmailModal = useCallback(() => {
    setIsEmailModalOpen(true)
  }, [])

  const closeEmailModal = useCallback(() => {
    setIsEmailModalOpen(false)
  }, [])

  const openSMSModal = useCallback(() => {
    setIsSMSModalOpen(true)
  }, [])

  const closeSMSModal = useCallback(() => {
    setIsSMSModalOpen(false)
  }, [])

  /**
   * Communication Detail Modal Controls
   */
  const openCommunicationDetail = useCallback((communication: any) => {
    setSelectedCommunication(communication)
    setIsCommunicationDetailOpen(true)
  }, [])

  const closeCommunicationDetail = useCallback(() => {
    setIsCommunicationDetailOpen(false)
    setSelectedCommunication(null)
  }, [])

  /**
   * Activity Detail Modal Controls
   */
  const openActivityDetail = useCallback((activity: any) => {
    setSelectedActivity(activity)
    setIsActivityDetailOpen(true)
  }, [])

  const closeActivityDetail = useCallback(() => {
    setIsActivityDetailOpen(false)
    setSelectedActivity(null)
  }, [])

  /**
   * Event Date Detail Modal Controls
   */
  const openEventDateDetail = useCallback((eventDate: EventDate) => {
    setSelectedEventDate(eventDate)
    setIsEventDateDetailOpen(true)
  }, [])

  const closeEventDateDetail = useCallback(() => {
    setIsEventDateDetailOpen(false)
    setSelectedEventDate(null)
    setActiveEventDateTab(0)
  }, [])

  /**
   * Close all modals at once
   */
  const closeAllModals = useCallback(() => {
    setIsTaskModalOpen(false)
    setIsLogCommunicationModalOpen(false)
    setIsEmailModalOpen(false)
    setIsSMSModalOpen(false)
    setIsCommunicationDetailOpen(false)
    setIsActivityDetailOpen(false)
    setIsEventDateDetailOpen(false)
    setSelectedCommunication(null)
    setSelectedActivity(null)
    setSelectedEventDate(null)
  }, [])

  return {
    // Task modal
    isTaskModalOpen,
    setIsTaskModalOpen,
    tasksKey,
    setTasksKey,
    openTaskModal,
    closeTaskModal,
    refreshTasks,

    // Communication modals
    isLogCommunicationModalOpen,
    setIsLogCommunicationModalOpen,
    isEmailModalOpen,
    setIsEmailModalOpen,
    isSMSModalOpen,
    setIsSMSModalOpen,
    openLogCommunicationModal,
    closeLogCommunicationModal,
    openEmailModal,
    closeEmailModal,
    openSMSModal,
    closeSMSModal,

    // Communication detail
    selectedCommunication,
    setSelectedCommunication,
    isCommunicationDetailOpen,
    setIsCommunicationDetailOpen,
    openCommunicationDetail,
    closeCommunicationDetail,

    // Activity detail
    selectedActivity,
    setSelectedActivity,
    isActivityDetailOpen,
    setIsActivityDetailOpen,
    openActivityDetail,
    closeActivityDetail,

    // Event date detail
    selectedEventDate,
    setSelectedEventDate,
    isEventDateDetailOpen,
    setIsEventDateDetailOpen,
    activeEventDateTab,
    setActiveEventDateTab,
    openEventDateDetail,
    closeEventDateDetail,

    // Utility
    closeAllModals,
  }
}

