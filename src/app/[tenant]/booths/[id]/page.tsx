'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/app-layout'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  MapPin,
  Settings,
  Trash2,
  Edit,
  ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('id')

interface Booth {
  id: string
  booth_name: string
  booth_type: string
  status: string
  required_items: Record<string, number>
  is_complete: boolean
  is_active: boolean
  description: string | null
  notes: string | null
  assigned_to_event_id: string | null
  assigned_event_name: string | null
  assigned_event_start: string | null
  assigned_event_end: string | null
  assigned_to_user_id: string | null
  assigned_user_name: string | null
  deployed_date: string | null
  created_at: string
  updated_at: string
}

interface EquipmentItem {
  id: string
  item_id: string
  name: string
  equipment_type: string
  status: string
  model: string | null
  serial_number: string | null
  condition: string
  location: string | null
}

interface BoothAssignment {
  id: string
  event_name: string
  event_start_date: string
  event_end_date: string
  status: string
  checked_out_at: string
  checked_in_at: string | null
  checked_out_by_name: string
  checked_in_by_name: string | null
  condition_notes: string | null
}

export default function BoothDetailPage() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const boothId = params.id as string

  const [booth, setBooth] = useState<Booth | null>(null)
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [assignments, setAssignments] = useState<BoothAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session && tenant) {
      fetchData()
    }
  }, [session, tenant, boothId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch booth details
      const boothRes = await fetch(`/api/booths/${boothId}`)
      if (boothRes.ok) {
        const boothData = await boothRes.json()
        setBooth(boothData)
      }

      // Fetch assigned equipment
      const equipmentRes = await fetch(`/api/equipment-items?booth_id=${boothId}`)
      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json()
        setEquipment(equipmentData)
      }

      // Fetch deployment history
      const assignmentsRes = await fetch(`/api/booth-assignments?booth_id=${boothId}`)
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this booth?')) return

    try {
      const response = await fetch(`/api/booths/${boothId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push(`/${tenantSubdomain}/booths`)
      }
    } catch (error) {
      log.error({ error }, 'Error deleting booth')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'deployed':
        return 'bg-blue-100 text-blue-800'
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800'
      case 'maintenance':
        return 'bg-orange-100 text-orange-800'
      case 'retired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'text-green-600'
      case 'good':
        return 'text-blue-600'
      case 'fair':
        return 'text-yellow-600'
      case 'poor':
        return 'text-orange-600'
      case 'needs_repair':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const groupedEquipment = equipment.reduce((acc, item) => {
    if (!acc[item.equipment_type]) {
      acc[item.equipment_type] = []
    }
    acc[item.equipment_type].push(item)
    return acc
  }, {} as Record<string, EquipmentItem[]>)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AppLayout>
    )
  }

  if (!booth) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Booth not found</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href={`/${tenantSubdomain}/booths`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Booths
          </Button>
        </Link>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{booth.booth_name}</h1>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booth.status)}`}>
              {booth.status}
            </span>
            {booth.is_complete ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <XCircle className="h-4 w-4 mr-1" />
                Incomplete
              </span>
            )}
            <span className="text-sm text-gray-600 capitalize">{booth.booth_type.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/${tenantSubdomain}/booths/${boothId}/configure`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-semibold text-gray-900">Current Event</h3>
          </div>
          {booth.assigned_event_name ? (
            <div>
              <p className="text-lg font-medium text-gray-900">{booth.assigned_event_name}</p>
              {booth.assigned_event_start && (
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(booth.assigned_event_start).toLocaleDateString()}
                  {booth.assigned_event_end && ` - ${new Date(booth.assigned_event_end).toLocaleDateString()}`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Not assigned to any event</p>
          )}
        </div>

        {/* Assigned User */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-semibold text-gray-900">Assigned To</h3>
          </div>
          {booth.assigned_user_name ? (
            <p className="text-lg font-medium text-gray-900">{booth.assigned_user_name}</p>
          ) : (
            <p className="text-gray-500">Not assigned to any user</p>
          )}
        </div>

        {/* Equipment Count */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Package className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-semibold text-gray-900">Equipment</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{equipment.length}</p>
          <p className="text-sm text-gray-600 mt-1">items assigned</p>
        </div>
      </div>

      {/* Description & Notes */}
      {(booth.description || booth.notes) && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {booth.description && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{booth.description}</p>
            </div>
          )}
          {booth.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{booth.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Required Items Checklist */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Required Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(booth.required_items || {}).map(([type, required]) => {
            const actual = groupedEquipment[type]?.length || 0
            const isComplete = actual >= (required as number)

            return (
              <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-3" />
                  )}
                  <span className="font-medium capitalize">{type}</span>
                </div>
                <span className={`font-semibold ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
                  {actual} / {required}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assigned Equipment */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Assigned Equipment</h2>
        </div>

        {equipment.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="mb-4">No equipment assigned to this booth</p>
            <Link href={`/${tenantSubdomain}/booths/${boothId}/configure`}>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configure Equipment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="p-6">
            {Object.entries(groupedEquipment).map(([type, items]) => (
              <div key={type} className="mb-6 last:mb-0">
                <h3 className="font-semibold text-gray-900 mb-3 capitalize flex items-center">
                  <Package className="h-4 w-4 mr-2 text-gray-400" />
                  {type} ({items.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{item.item_id}</span>
                        <span className={`text-xs font-medium capitalize ${getConditionColor(item.condition)}`}>
                          {item.condition}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{item.name}</p>
                      {item.model && (
                        <p className="text-xs text-gray-600 mb-1">Model: {item.model}</p>
                      )}
                      {item.serial_number && (
                        <p className="text-xs text-gray-600 mb-1">S/N: {item.serial_number}</p>
                      )}
                      {item.location && (
                        <div className="flex items-center text-xs text-gray-600 mt-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {item.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deployment History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Deployment History</h2>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No deployment history</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Checked Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Checked In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{assignment.event_name}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(assignment.event_start_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{assignment.checked_out_by_name}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(assignment.checked_out_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {assignment.checked_in_at ? (
                        <>
                          <div className="text-gray-900">{assignment.checked_in_by_name}</div>
                          <div className="text-xs text-gray-600">
                            {new Date(assignment.checked_in_at).toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {assignment.condition_notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
