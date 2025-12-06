'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'
import { EntityForm } from '@/components/forms/EntityForm'
import { createLogger } from '@/lib/logger'

const log = createLogger('inventory')
import {
  usePhysicalAddressesData,
  useAddPhysicalAddress,
  useUpdatePhysicalAddress,
  useDeletePhysicalAddress
} from '@/hooks/usePhysicalAddressesData'

export function PhysicalAddressesList() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<any>(null)

  // Data hooks
  const { data: addresses = [], isLoading } = usePhysicalAddressesData()
  const addAddress = useAddPhysicalAddress()
  const updateAddress = useUpdatePhysicalAddress()
  const deleteAddress = useDeletePhysicalAddress()

  const handleSubmit = async (data: any) => {
    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({ addressId: editingAddress.id, addressData: data })
      } else {
        await addAddress.mutateAsync(data)
      }
      setIsModalOpen(false)
      setEditingAddress(null)
    } catch (error: any) {
      log.error({ error }, 'Failed to save physical address')
      alert(error.message || 'Failed to save physical address')
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this physical address?')) return

    try {
      await deleteAddress.mutateAsync(addressId)
    } catch (error: any) {
      alert(error.message || 'Failed to delete physical address')
    }
  }

  const openCreateModal = () => {
    setEditingAddress(null)
    setIsModalOpen(true)
  }

  const openEditModal = (address: any) => {
    setEditingAddress(address)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Physical Addresses</h2>
          <p className="text-gray-600">Manage warehouse and office locations</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Addresses Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading physical addresses...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No physical addresses found</p>
          <p className="text-sm text-gray-400 mb-4">Add locations like warehouses or offices to assign inventory</p>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Location
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((address: any) => (
            <div key={address.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{address.location_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {address.street_address}
                    </p>
                    <p className="text-sm text-gray-500">
                      {address.city}, {address.state_province} {address.zip_postal_code}
                    </p>
                    <p className="text-sm text-gray-500">{address.country}</p>
                  </div>
                </div>
              </div>

              {address.location_notes && (
                <p className="text-sm text-gray-600 mb-4 border-t pt-4">
                  {address.location_notes}
                </p>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditModal(address)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <EntityForm
        entity="physical_address"
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingAddress(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingAddress || undefined}
        title={editingAddress ? 'Edit Physical Address' : 'New Physical Address'}
        submitLabel={editingAddress ? 'Update Location' : 'Create Location'}
      />
    </div>
  )
}
