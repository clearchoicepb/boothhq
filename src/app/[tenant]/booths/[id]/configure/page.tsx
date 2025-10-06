'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/app-layout'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, CheckCircle, XCircle, Plus, Trash2, Save } from 'lucide-react'
import Link from 'next/link'

interface Booth {
  id: string
  booth_name: string
  booth_type: string
  status: string
  required_items: Record<string, number>
  is_complete: boolean
  description: string | null
}

interface EquipmentItem {
  id: string
  item_id: string
  name: string
  equipment_type: string
  status: string
  booth_id: string | null
  model: string | null
  serial_number: string | null
}

export default function BoothConfigurePage() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const params = useParams()
  const router = useRouter()
  const tenantSubdomain = params.tenant as string
  const boothId = params.id as string

  const [booth, setBooth] = useState<Booth | null>(null)
  const [assignedEquipment, setAssignedEquipment] = useState<EquipmentItem[]>([])
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

      // Fetch equipment assigned to this booth
      const assignedRes = await fetch(`/api/equipment-items?booth_id=${boothId}`)
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json()
        setAssignedEquipment(assignedData)
      }

      // Fetch available equipment (not assigned to any booth)
      const availableRes = await fetch(`/api/equipment-items?status=available`)
      if (availableRes.ok) {
        const availableData = await availableRes.json()
        setAvailableEquipment(availableData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const assignEquipment = async (equipmentId: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/equipment-items/${equipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booth_id: boothId,
          status: 'assigned_to_booth'
        })
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error assigning equipment:', error)
    } finally {
      setSaving(false)
    }
  }

  const unassignEquipment = async (equipmentId: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/equipment-items/${equipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booth_id: null,
          status: 'available'
        })
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error unassigning equipment:', error)
    } finally {
      setSaving(false)
    }
  }

  const getEquipmentCountByType = (type: string) => {
    return assignedEquipment.filter(e => e.equipment_type === type).length
  }

  const getRequirementStatus = (type: string, required: number) => {
    const actual = getEquipmentCountByType(type)
    if (actual >= required) {
      return { status: 'complete', color: 'text-green-600', icon: CheckCircle }
    }
    return { status: 'incomplete', color: 'text-red-600', icon: XCircle }
  }

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
      <div className="mb-6">
        <Link href={`/${tenantSubdomain}/booths`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Booths
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configure {booth.booth_name}</h1>
        <p className="text-gray-600">
          Assign equipment to this {booth.booth_type} booth
        </p>
      </div>

      {/* Completion Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Booth Status</h2>
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
        </div>

        {/* Requirements Checklist */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Required Items</h3>
          {Object.entries(booth.required_items || {}).map(([type, required]) => {
            const actual = getEquipmentCountByType(type)
            const { status, color, icon: Icon } = getRequirementStatus(type, required as number)

            return (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center">
                  <Icon className={`h-5 w-5 mr-2 ${color}`} />
                  <span className="font-medium capitalize">{type}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={actual >= (required as number) ? 'text-green-600 font-medium' : 'text-gray-600'}>
                    {actual} / {required}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assigned Equipment */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Assigned Equipment</h2>
          <p className="text-sm text-gray-600 mt-1">
            {assignedEquipment.length} item{assignedEquipment.length !== 1 ? 's' : ''} assigned
          </p>
        </div>

        {assignedEquipment.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No equipment assigned to this booth yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedEquipment.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="capitalize">{item.equipment_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.model || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.serial_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unassignEquipment(item.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Equipment */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Available Equipment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Select equipment to add to this booth
          </p>
        </div>

        {availableEquipment.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No available equipment</p>
            <p className="text-sm mt-2">All equipment is already assigned</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {availableEquipment.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="capitalize">{item.equipment_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.model || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.serial_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        size="sm"
                        onClick={() => assignEquipment(item.id)}
                        disabled={saving}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
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
