import { useState, useCallback } from 'react'
import { EventDate } from './useEventData'

/**
 * Custom hook for managing inline editing states
 * Handles edit mode, form data, and save/cancel operations
 * 
 * @returns Editing states and control functions
 */
export function useEventEditing() {
  // Account/Contact editing
  const [isEditingAccountContact, setIsEditingAccountContact] = useState(false)
  const [editAccountId, setEditAccountId] = useState<string>('')
  const [editContactId, setEditContactId] = useState<string>('')

  // Event Date editing
  const [isEditingEventDate, setIsEditingEventDate] = useState(false)
  const [editEventDateData, setEditEventDateData] = useState<Partial<EventDate>>({})

  // Payment Status editing
  const [isEditingPaymentStatus, setIsEditingPaymentStatus] = useState(false)

  // Description editing
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState<string>('')

  /**
   * Account/Contact Editing Controls
   */
  const startEditingAccountContact = useCallback((accountId: string, contactId: string) => {
    setEditAccountId(accountId)
    setEditContactId(contactId)
    setIsEditingAccountContact(true)
  }, [])

  const cancelEditingAccountContact = useCallback(() => {
    setEditAccountId('')
    setEditContactId('')
    setIsEditingAccountContact(false)
  }, [])

  const finishEditingAccountContact = useCallback(() => {
    setIsEditingAccountContact(false)
  }, [])

  /**
   * Event Date Editing Controls
   */
  const startEditingEventDate = useCallback((eventDate: Partial<EventDate>) => {
    setEditEventDateData(eventDate)
    setIsEditingEventDate(true)
  }, [])

  const cancelEditingEventDate = useCallback(() => {
    setEditEventDateData({})
    setIsEditingEventDate(false)
  }, [])

  const finishEditingEventDate = useCallback(() => {
    setEditEventDateData({})
    setIsEditingEventDate(false)
  }, [])

  /**
   * Payment Status Editing Controls
   */
  const startEditingPaymentStatus = useCallback(() => {
    setIsEditingPaymentStatus(true)
  }, [])

  const cancelEditingPaymentStatus = useCallback(() => {
    setIsEditingPaymentStatus(false)
  }, [])

  const finishEditingPaymentStatus = useCallback(() => {
    setIsEditingPaymentStatus(false)
  }, [])

  /**
   * Description Editing Controls
   */
  const startEditingDescription = useCallback((description: string) => {
    setEditedDescription(description)
    setIsEditingDescription(true)
  }, [])

  const cancelEditingDescription = useCallback(() => {
    setEditedDescription('')
    setIsEditingDescription(false)
  }, [])

  const finishEditingDescription = useCallback(() => {
    setIsEditingDescription(false)
  }, [])

  /**
   * Cancel all editing modes
   */
  const cancelAllEditing = useCallback(() => {
    setIsEditingAccountContact(false)
    setEditAccountId('')
    setEditContactId('')
    setIsEditingEventDate(false)
    setEditEventDateData({})
    setIsEditingPaymentStatus(false)
    setIsEditingDescription(false)
    setEditedDescription('')
  }, [])

  return {
    // Account/Contact editing
    isEditingAccountContact,
    editAccountId,
    editContactId,
    setEditAccountId,
    setEditContactId,
    startEditingAccountContact,
    cancelEditingAccountContact,
    finishEditingAccountContact,

    // Event Date editing
    isEditingEventDate,
    editEventDateData,
    setEditEventDateData,
    startEditingEventDate,
    cancelEditingEventDate,
    finishEditingEventDate,

    // Payment Status editing
    isEditingPaymentStatus,
    startEditingPaymentStatus,
    cancelEditingPaymentStatus,
    finishEditingPaymentStatus,

    // Description editing
    isEditingDescription,
    editedDescription,
    setEditedDescription,
    startEditingDescription,
    cancelEditingDescription,
    finishEditingDescription,

    // Utility
    cancelAllEditing,
  }
}

