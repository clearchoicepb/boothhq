import { useState, useCallback } from 'react'
import { useEventStaffData, useAddEventStaff, useUpdateEventStaff, useRemoveEventStaff } from './useEventStaffData'
import { useUsers } from './useUsers'
import { useStaffRoles } from './useStaffRoles'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

/**
 * Custom hook for managing event staff assignments
 * Now powered by React Query for automatic caching and performance
 *
 * @param eventId - The ID of the event
 * @returns Staff state, data, and functions
 */
export function useEventStaff(eventId: string) {
  // Add staff form state
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedStaffRoleId, setSelectedStaffRoleId] = useState<string>('')
  const [staffRole, setStaffRole] = useState<string>('')
  const [staffNotes, setStaffNotes] = useState<string>('')
  const [selectedDateTimes, setSelectedDateTimes] = useState<Array<{dateId: string, startTime: string, endTime: string}>>([])

  // UI state
  const [operationsTeamExpanded, setOperationsTeamExpanded] = useState(true)
  const [eventStaffExpanded, setEventStaffExpanded] = useState(true)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)

  // Use React Query hooks for data fetching
  const staffQuery = useEventStaffData(eventId)
  const usersQuery = useUsers()
  const staffRolesQuery = useStaffRoles(true)

  // Use React Query mutations
  const addStaffMutation = useAddEventStaff(eventId)
  const updateStaffMutation = useUpdateEventStaff(eventId)
  const removeStaffMutation = useRemoveEventStaff(eventId)

  /**
   * Add a new staff assignment
   */
  const addStaff = useCallback(async (staffData: any) => {
    try {
      await addStaffMutation.mutateAsync(staffData)
      return true
    } catch (error) {
      log.error({ error }, 'Error adding staff')
      return false
    }
  }, [addStaffMutation])

  /**
   * Remove a staff assignment
   */
  const removeStaff = useCallback(async (staffId: string) => {
    try {
      await removeStaffMutation.mutateAsync(staffId)
      return true
    } catch (error) {
      log.error({ error }, 'Error removing staff')
      return false
    }
  }, [removeStaffMutation])

  /**
   * Update a staff assignment
   */
  const updateStaff = useCallback(async (staffId: string, staffData: any) => {
    try {
      await updateStaffMutation.mutateAsync({ staffId, staffData })
      return true
    } catch (error) {
      log.error({ error }, 'Error updating staff')
      return false
    }
  }, [updateStaffMutation])

  /**
   * Reset add staff form
   */
  const resetAddStaffForm = useCallback(() => {
    setIsAddingStaff(false)
    setSelectedUserId('')
    setSelectedStaffRoleId('')
    setStaffRole('')
    setStaffNotes('')
    setSelectedDateTimes([])
  }, [])

  /**
   * Fetch all staff-related data (refetch)
   */
  const fetchAll = useCallback(async () => {
    await Promise.all([
      staffQuery.refetch(),
      usersQuery.refetch(),
      staffRolesQuery.refetch()
    ])
  }, [staffQuery, usersQuery, staffRolesQuery])

  return {
    // Staff data (with fallbacks)
    staffAssignments: staffQuery.data ?? [],
    users: usersQuery.data ?? [],
    staffRoles: staffRolesQuery.data ?? [],
    loadingStaff: staffQuery.isLoading || usersQuery.isLoading || staffRolesQuery.isLoading,

    // Add staff form
    isAddingStaff,
    setIsAddingStaff,
    selectedUserId,
    setSelectedUserId,
    selectedStaffRoleId,
    setSelectedStaffRoleId,
    staffRole,
    setStaffRole,
    staffNotes,
    setStaffNotes,
    selectedDateTimes,
    setSelectedDateTimes,
    resetAddStaffForm,

    // UI state
    operationsTeamExpanded,
    setOperationsTeamExpanded,
    eventStaffExpanded,
    setEventStaffExpanded,
    editingStaffId,
    setEditingStaffId,

    // CRUD operations (mapped to React Query)
    fetchStaff: staffQuery.refetch,
    fetchUsers: usersQuery.refetch,
    fetchStaffRoles: staffRolesQuery.refetch,
    fetchAll,
    addStaff,
    removeStaff,
    updateStaff,

    // Setters (for backward compatibility - now no-ops)
    setStaffAssignments: () => {},
    setUsers: () => {},
    setStaffRoles: () => {},
  }
}


