'use client'

import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAvailableUsers } from '@/hooks/useAvailableUsers'
import { useStaffRoles } from '@/hooks/useStaffRoles'
import { ChevronDown, Check, Loader2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import type { DepartmentId } from '@/lib/departments'

interface StaffAssignment {
  assignment_id: string
  user_id: string
  first_name: string
  last_name: string
}

interface StaffAssignmentDropdownProps {
  eventId: string
  roleType: 'event_manager' | 'designer'
  department: DepartmentId
  currentAssignment: StaffAssignment | null
  onAssigned: () => void
}

/**
 * Inline dropdown for assigning staff to events
 * Allows quick assignment with instant save
 */
export function StaffAssignmentDropdown({
  eventId,
  roleType,
  department,
  currentAssignment,
  onAssigned
}: StaffAssignmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch available users when dropdown opens
  const {
    data: rawUsers,
    isLoading: usersLoading
  } = useAvailableUsers(isOpen ? eventId : null, isOpen ? department : null)

  // Fetch staff roles to get the correct role ID
  const { data: staffRoles } = useStaffRoles(true)

  // Use rawUsers directly - no distance calculations needed
  const users = rawUsers || []

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  /**
   * Find the appropriate staff role ID based on role type
   */
  const getStaffRoleId = (): string | null => {
    if (!staffRoles) return null

    const roleName = roleType === 'event_manager' ? 'event manager' : 'graphic designer'

    // Find role that matches the name (case-insensitive)
    const role = staffRoles.find((r: any) => {
      const name = r.name?.toLowerCase() || ''
      if (roleType === 'event_manager') {
        return name.includes('manager') || name.includes('event manager')
      } else {
        return name.includes('designer') || name.includes('graphic')
      }
    })

    return role?.id || null
  }

  /**
   * Handle selecting a user from the dropdown
   */
  const handleSelectUser = async (userId: string) => {
    const staffRoleId = getStaffRoleId()

    if (!staffRoleId) {
      toast.error('Staff role not found. Please configure staff roles in settings.')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/event-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          user_id: userId,
          staff_role_id: staffRoleId,
          event_date_id: null // Operations roles are event-level
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign staff')
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['event-staffing'] })
      queryClient.invalidateQueries({ queryKey: ['event-staffing-counts'] })
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })

      toast.success('Staff assigned successfully')
      setIsOpen(false)
      onAssigned()
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign staff')
    } finally {
      setIsSaving(false)
    }
  }

  // If already assigned, show the current assignment
  if (currentAssignment) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {currentAssignment.first_name} {currentAssignment.last_name}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving}
        className={`
          flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border
          transition-colors
          ${isOpen
            ? 'bg-[#347dc4] text-white border-[#347dc4]'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }
          ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Assigning...
          </>
        ) : (
          <>
            <User className="h-4 w-4" />
            Assign
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
          {usersLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Loading staff...</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">No staff available in this department</p>
              <p className="text-xs text-gray-400 mt-1">
                Add users to the {department} department in settings
              </p>
            </div>
          ) : (
            <ul className="py-1 max-h-56 overflow-auto">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectUser(user.id)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-gray-900"
                  >
                    <p className="text-sm font-medium truncate">
                      {user.first_name} {user.last_name}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
