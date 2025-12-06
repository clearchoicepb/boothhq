'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Package, Plus, Trash2, CheckCircle, Calendar, User, X } from 'lucide-react'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

interface Booth {
  id: string
  booth_name: string
  booth_type: string
  status: string
  is_complete: boolean
}

interface BoothAssignment {
  id: string
  booth_id: string
  booth_name: string
  booth_type: string
  status: string
  assigned_date: string
  checked_out_at: string | null
  checked_in_at: string | null
  checked_out_by_name: string | null
  checked_in_by_name: string | null
  condition_notes: string | null
}

interface EventBoothAssignmentsProps {
  eventId: string
  tenantSubdomain: string
}

export function EventBoothAssignments({ eventId, tenantSubdomain }: EventBoothAssignmentsProps) {
  const [assignments, setAssignments] = useState<BoothAssignment[]>([])
  const [availableBooths, setAvailableBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedBoothId, setSelectedBoothId] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [eventId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch booth assignments for this event
      const assignmentsRes = await fetch(`/api/booth-assignments?event_id=${eventId}`)
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData)
      }

      // Fetch available booths (ready and not deployed)
      const boothsRes = await fetch(`/api/booths?status=ready&is_active=true`)
      if (boothsRes.ok) {
        const boothsData = await boothsRes.json()
        setAvailableBooths(boothsData.filter((b: Booth) => b.is_complete))
      }
    } catch (error) {
      log.error({ error }, 'Error fetching booth assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignBooth = async () => {
    if (!selectedBoothId) return

    try {
      const response = await fetch('/api/booth-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booth_id: selectedBoothId,
          event_id: eventId,
          status: 'pending',
          assigned_date: new Date().toISOString()
        })
      })

      if (response.ok) {
        setSelectedBoothId('')
        setIsAssigning(false)
        await fetchData()
      }
    } catch (error) {
      log.error({ error }, 'Error assigning booth')
    }
  }

  const handleCheckOut = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/booth-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'deployed',
          checked_out_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      log.error({ error }, 'Error checking out booth')
    }
  }

  const handleCheckIn = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/booth-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'returned',
          checked_in_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      log.error({ error }, 'Error checking in booth')
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this booth assignment?')) return

    try {
      const response = await fetch(`/api/booth-assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      log.error({ error }, 'Error removing booth assignment')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'deployed':
        return 'bg-blue-100 text-blue-800'
      case 'returned':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading booth assignments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Booth Assignments</h3>
            <p className="text-sm text-gray-600 mt-1">
              {assignments.length} booth{assignments.length !== 1 ? 's' : ''} assigned to this event
            </p>
          </div>
          {!isAssigning && (
            <Button onClick={() => setIsAssigning(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Assign Booth
            </Button>
          )}
        </div>

        {/* Assign Booth Form */}
        {isAssigning && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Booth
                </label>
                <select
                  value={selectedBoothId}
                  onChange={(e) => setSelectedBoothId(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Choose a booth...</option>
                  {availableBooths.map((booth) => (
                    <option key={booth.id} value={booth.id}>
                      {booth.booth_name} ({booth.booth_type})
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleAssignBooth} disabled={!selectedBoothId}>
                Assign
              </Button>
              <Button variant="outline" onClick={() => {
                setIsAssigning(false)
                setSelectedBoothId('')
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {availableBooths.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No complete booths available. Configure booth equipment first.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="mb-2">No booths assigned to this event</p>
          <p className="text-sm">Assign a booth to track equipment for this event</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Package className="h-5 w-5 text-gray-400" />
                    <h4 className="text-lg font-medium text-gray-900">
                      {assignment.booth_name}
                    </h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                      {assignment.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 capitalize">
                    {assignment.booth_type.replace(/_/g, ' ')} Booth
                  </p>

                  {/* Assignment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Assigned:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(assignment.assigned_date).toLocaleDateString()}
                      </span>
                    </div>

                    {assignment.checked_out_at && (
                      <div>
                        <span className="text-gray-600">Checked Out:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(assignment.checked_out_at).toLocaleDateString()}
                          {assignment.checked_out_by_name && ` by ${assignment.checked_out_by_name}`}
                        </span>
                      </div>
                    )}

                    {assignment.checked_in_at && (
                      <div>
                        <span className="text-gray-600">Checked In:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(assignment.checked_in_at).toLocaleDateString()}
                          {assignment.checked_in_by_name && ` by ${assignment.checked_in_by_name}`}
                        </span>
                      </div>
                    )}

                    {assignment.condition_notes && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Notes:</span>
                        <span className="ml-2 text-gray-900">{assignment.condition_notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 ml-4">
                  {assignment.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(assignment.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Check Out
                    </Button>
                  )}

                  {assignment.status === 'deployed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckIn(assignment.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveAssignment(assignment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
