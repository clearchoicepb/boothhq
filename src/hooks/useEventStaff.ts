import { useState, useCallback, useEffect } from 'react'

/**
 * Custom hook for managing event staff assignments
 * Handles staff data, roles, users, and CRUD operations
 * 
 * @param eventId - The ID of the event
 * @param session - The user session object
 * @param tenant - The tenant object
 * @returns Staff state, data, and functions
 */
export function useEventStaff(
  eventId: string,
  session: any,
  tenant: any
) {
  // Staff data
  const [staffAssignments, setStaffAssignments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [staffRoles, setStaffRoles] = useState<any[]>([])

  // Loading state
  const [loadingStaff, setLoadingStaff] = useState(false)

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

  /**
   * Fetch staff assignments for the event
   */
  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true)
      const response = await fetch(`/api/event-staff?event_id=${eventId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch event staff')
      }
      
      const data = await response.json()
      setStaffAssignments(data)
    } catch (error) {
      console.error('Error fetching event staff:', error)
    } finally {
      setLoadingStaff(false)
    }
  }, [eventId])

  /**
   * Fetch available users for staff assignment
   */
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  /**
   * Fetch staff roles for dropdown
   */
  const fetchStaffRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/staff-roles?active_only=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch staff roles')
      }
      
      const data = await response.json()
      setStaffRoles(data)
    } catch (error) {
      console.error('Error fetching staff roles:', error)
    }
  }, [])

  /**
   * Add a new staff assignment
   */
  const addStaff = useCallback(async (staffData: any) => {
    try {
      const response = await fetch('/api/event-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffData),
      })

      if (!response.ok) {
        throw new Error('Failed to add staff')
      }

      await fetchStaff()
      return true
    } catch (error) {
      console.error('Error adding staff:', error)
      return false
    }
  }, [fetchStaff])

  /**
   * Remove a staff assignment
   */
  const removeStaff = useCallback(async (staffId: string) => {
    try {
      const response = await fetch(`/api/event-staff/${staffId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove staff')
      }

      await fetchStaff()
      return true
    } catch (error) {
      console.error('Error removing staff:', error)
      return false
    }
  }, [fetchStaff])

  /**
   * Update a staff assignment
   */
  const updateStaff = useCallback(async (staffId: string, staffData: any) => {
    try {
      const response = await fetch(`/api/event-staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffData),
      })

      if (!response.ok) {
        throw new Error('Failed to update staff')
      }

      await fetchStaff()
      return true
    } catch (error) {
      console.error('Error updating staff:', error)
      return false
    }
  }, [fetchStaff])

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
   * Fetch all staff-related data
   */
  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchStaff(),
      fetchUsers(),
      fetchStaffRoles()
    ])
  }, [fetchStaff, fetchUsers, fetchStaffRoles])

  /**
   * Initial data fetch on mount (only when staffing tab is active)
   */
  useEffect(() => {
    if (session && tenant && eventId) {
      fetchStaff()
      fetchUsers()
      fetchStaffRoles()
    }
  }, [session, tenant, eventId, fetchStaff, fetchUsers, fetchStaffRoles])

  return {
    // Staff data
    staffAssignments,
    users,
    staffRoles,
    loadingStaff,

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

    // CRUD operations
    fetchStaff,
    fetchUsers,
    fetchStaffRoles,
    fetchAll,
    addStaff,
    removeStaff,
    updateStaff,

    // Setters (for advanced use cases)
    setStaffAssignments,
    setUsers,
    setStaffRoles,
  }
}

