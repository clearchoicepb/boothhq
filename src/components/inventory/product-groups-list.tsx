'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Package, Users, MapPin } from 'lucide-react'
import { EntityForm } from '@/components/forms/EntityForm'
import {
  useProductGroupsData,
  useAddProductGroup,
  useUpdateProductGroup,
  useDeleteProductGroup
} from '@/hooks/useProductGroupsData'

export function ProductGroupsList() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)

  // Data hooks
  const { data: groups = [], isLoading } = useProductGroupsData()
  const addGroup = useAddProductGroup()
  const updateGroup = useUpdateProductGroup()
  const deleteGroup = useDeleteProductGroup()

  const handleSubmit = async (data: any) => {
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({ groupId: editingGroup.id, groupData: data })
      } else {
        await addGroup.mutateAsync(data)
      }
      setIsModalOpen(false)
      setEditingGroup(null)
    } catch (error: any) {
      console.error('Failed to save product group:', error)
      alert(error.message || 'Failed to save product group')
    }
  }

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this product group? Items in this group will become unassigned.')) return

    try {
      await deleteGroup.mutateAsync(groupId)
    } catch (error: any) {
      alert(error.message || 'Failed to delete product group')
    }
  }

  const openCreateModal = () => {
    setEditingGroup(null)
    setIsModalOpen(true)
  }

  const openEditModal = (group: any) => {
    setEditingGroup(group)
    setIsModalOpen(true)
  }

  const getAssignmentIcon = (assignedToType: string) => {
    if (assignedToType === 'user') return <Users className="h-5 w-5 text-blue-600" />
    if (assignedToType === 'physical_address') return <MapPin className="h-5 w-5 text-green-600" />
    return <Package className="h-5 w-5 text-gray-600" />
  }

  const getAssignmentLabel = (assignedToType: string) => {
    if (assignedToType === 'user') return 'Assigned to User'
    if (assignedToType === 'physical_address') return 'Assigned to Location'
    return 'Unassigned'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Product Groups</h2>
          <p className="text-gray-600">Manage equipment bundles and kits</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="text-center py-12">Loading product groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No product groups found</p>
          <p className="text-sm text-gray-400 mb-4">
            Create equipment bundles to assign multiple items at once
          </p>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group: any) => (
            <div key={group.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{group.group_name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4 border-t pt-4">
                <div className="flex items-center gap-2 text-sm">
                  {getAssignmentIcon(group.assigned_to_type)}
                  <span className="text-gray-700">
                    {getAssignmentLabel(group.assigned_to_type)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {group.product_group_items?.length || 0} items
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditModal(group)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(group.id)}
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
        entity="product_group"
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingGroup(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingGroup || undefined}
        title={editingGroup ? 'Edit Product Group' : 'New Product Group'}
        submitLabel={editingGroup ? 'Update Group' : 'Create Group'}
      />
    </div>
  )
}
