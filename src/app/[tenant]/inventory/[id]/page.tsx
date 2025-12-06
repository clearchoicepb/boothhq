'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit, Trash2, Package, MapPin, DollarSign, Calendar, Wrench, FileText } from 'lucide-react'
import Link from 'next/link'
import { createLogger } from '@/lib/logger'

const log = createLogger('id')

interface Equipment {
  id: string
  name: string
  description: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_price: number | null
  current_value: number | null
  status: string
  condition: string
  location: string | null
  maintenance_notes: string | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  photo_url: string | null
  category_id: string | null
  category_name: string | null
  created_at: string
  updated_at: string
}

export default function EquipmentDetailPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const equipmentId = params.id as string
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [localLoading, setLocalLoading] = useState(true)

  useEffect(() => {
    if (session && tenant && equipmentId) {
      fetchEquipment()
    }
  }, [session, tenant, equipmentId])

  const fetchEquipment = async () => {
    try {
      setLocalLoading(true)
      
      const response = await fetch(`/api/equipment/${equipmentId}`)
      
      if (!response.ok) {
        log.error('Error fetching equipment')
        return
      }

      const data = await response.json()
      setEquipment(data)
    } catch (error) {
      log.error({ error }, 'Error')
    } finally {
      setLocalLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'in_use':
        return 'bg-blue-100 text-blue-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'retired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800'
      case 'good':
        return 'bg-blue-100 text-blue-800'
      case 'fair':
        return 'bg-yellow-100 text-yellow-800'
      case 'poor':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Equipment Not Found</h1>
          <p className="text-gray-600 mb-4">The equipment you're looking for doesn't exist.</p>
          <Link href={`/${tenantSubdomain}/inventory`}>
            <Button>Back to Inventory</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href={`/${tenantSubdomain}/inventory`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-12 w-12">
                  {equipment.photo_url ? (
                    <img className="h-12 w-12 rounded-lg object-cover" src={equipment.photo_url} alt={equipment.name} />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{equipment.name}</h1>
                  <p className="text-gray-600">Equipment Details</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href={`/${tenantSubdomain}/inventory/${equipment.id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Equipment Name</label>
                  <p className="text-sm text-gray-900">{equipment.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                  <p className="text-sm text-gray-900">{equipment.category_name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Model</label>
                  <p className="text-sm text-gray-900">{equipment.model || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Serial Number</label>
                  <p className="text-sm text-gray-900">{equipment.serial_number || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(equipment.status)}`}>
                    {equipment.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Condition</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(equipment.condition)}`}>
                    {equipment.condition}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {equipment.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-sm text-gray-900">{equipment.description}</p>
              </div>
            )}

            {/* Location */}
            {equipment.location && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900">{equipment.location}</p>
                </div>
              </div>
            )}

            {/* Financial Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Price</label>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {equipment.purchase_price ? `$${equipment.purchase_price.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Current Value</label>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {equipment.current_value ? `$${equipment.current_value.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>
                {equipment.purchase_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Purchase Date</label>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-sm text-gray-900">{new Date(equipment.purchase_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Maintenance</label>
                  <div className="flex items-center">
                    <Wrench className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {equipment.last_maintenance_date ? new Date(equipment.last_maintenance_date).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Next Maintenance</label>
                  <div className="flex items-center">
                    <Wrench className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-sm text-gray-900">
                      {equipment.next_maintenance_date ? new Date(equipment.next_maintenance_date).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
              {equipment.maintenance_notes && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Maintenance Notes</label>
                  <div className="flex items-start">
                    <FileText className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{equipment.maintenance_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full" variant="outline">
                  <Wrench className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
                <Button className="w-full" variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Assign to Event
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">
                    {new Date(equipment.created_at).toLocaleDateString()} at {new Date(equipment.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {new Date(equipment.updated_at).toLocaleDateString()} at {new Date(equipment.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}






