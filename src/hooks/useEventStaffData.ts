import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('hooks')

/**
 * Fetches staff assignments for an event
 */
async function fetchEventStaff(eventId: string): Promise<any[]> {
  const response = await fetch(`/api/event-staff?event_id=${eventId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch event staff')
  }
  return response.json()
}

/**
 * Fetches event staff assignments with React Query
 */
export function useEventStaffData(eventId: string) {
  return useQuery({
    queryKey: ['event-staff', eventId],
    queryFn: () => fetchEventStaff(eventId),
    staleTime: 30 * 1000,
    enabled: Boolean(eventId),
  })
}

/**
 * Add a new staff assignment mutation
 */
export function useAddEventStaff(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (staffData: any) => {
      const response = await fetch('/api/event-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      if (!response.ok) {
        throw new Error('Failed to add staff')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })
      toast.success('Staff added successfully')
    },
    onError: (error: Error) => {
      log.error({ error, eventId }, 'Failed to add staff')
      toast.error(error.message || 'Failed to add staff')
    }
  })
}

/**
 * Update a staff assignment mutation
 */
export function useUpdateEventStaff(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ staffId, staffData }: { staffId: string; staffData: any }) => {
      const response = await fetch(`/api/event-staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      })
      if (!response.ok) {
        throw new Error('Failed to update staff')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })
      toast.success('Staff updated successfully')
    },
    onError: (error: Error) => {
      log.error({ error, eventId }, 'Failed to update staff')
      toast.error(error.message || 'Failed to update staff')
    }
  })
}

/**
 * Remove a staff assignment mutation
 */
export function useRemoveEventStaff(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (staffId: string) => {
      const response = await fetch(`/api/event-staff/${staffId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('Failed to remove staff')
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-staff', eventId] })
      toast.success('Staff removed successfully')
    },
    onError: (error: Error) => {
      log.error({ error, eventId }, 'Failed to remove staff')
      toast.error(error.message || 'Failed to remove staff')
    }
  })
}
