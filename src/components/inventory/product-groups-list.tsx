'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Package, Users, MapPin, ChevronDown, ChevronUp, Eye, X, PlusCircle } from 'lucide-react'
import { EntityForm } from '@/components/forms/EntityForm'
import {
  useProductGroupsData,
  useAddProductGroup,
  useUpdateProductGroup,
  useDeleteProductGroup,
  useAddItemToProductGroup,
  useRemoveItemFromProductGroup
} from '@/hooks/useProductGroupsData'
import { useInventoryItemsData } from '@/hooks/useInventoryItemsData'

export function ProductGroupsList() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [groupDetails, setGroupDetails] = useState<Record<string, any>>({})
  const [isAddingItems, setIsAddingItems] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string>('')

  // Data hooks
  const { data: groups = [], isLoading } = useProductGroupsData()
  const { data: allInventoryItems = [] } = useInventoryItemsData()
  const addGroup = useAddProductGroup()
  const updateGroup = useUpdateProductGroup()
  const deleteGroup = useDeleteProductGroup()
  const addItemToGroup = useAddItemToProductGroup()
  const removeItemFromGroup = useRemoveItemFromProductGroup()

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

  const toggleGroupExpansion = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null)
    } else {
      setExpandedGroupId(groupId)
      // Fetch full details if not already loaded
      if (!groupDetails[groupId]) {
        try {
          const response = await fetch(`/api/product-groups/${groupId}`)
          if (response.ok) {
            const data = await response.json()
            setGroupDetails(prev => ({ ...prev, [groupId]: data }))
          }
        } catch (error) {
          console.error('Failed to fetch group details:', error)
        }
      }
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

  const handleAddItemToGroup = async (groupId: string) => {
    if (!selectedItemId) return

    try {
      await addItemToGroup.mutateAsync({ groupId, inventoryItemId: selectedItemId })
      setSelectedItemId('')
      setIsAddingItems(null)
      // Refresh group details
      const response = await fetch(`/api/product-groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setGroupDetails(prev => ({ ...prev, [groupId]: data }))
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add item to group')
    }
  }

  const handleRemoveItemFromGroup = async (groupId: string, inventoryItemId: string) => {
    if (!confirm('Remove this item from the group?')) return

    try {
      await removeItemFromGroup.mutateAsync({ groupId, inventoryItemId })
      // Refresh group details
      const response = await fetch(`/api/product-groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setGroupDetails(prev => ({ ...prev, [groupId]: data }))
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove item from group')
    }
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
          {groups.map((group: any) => {
            const isExpanded = expandedGroupId === group.id
            const details = groupDetails[group.id]

            return (
              <div key={group.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
                <div className="p-6">
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

                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {group.product_group_items?.length || 0} items
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroupExpansion(group.id)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Hide Items
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            View Items
                          </>
                        )}
                      </Button>
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

                {/* Expanded Items List */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    {details ? (
                      <>
                        {/* Add Item Section */}
                        <div className="mb-4 bg-white rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center gap-2">
                            <select
                              value={isAddingItems === group.id ? selectedItemId : ''}
                              onChange={(e) => {
                                setIsAddingItems(group.id)
                                setSelectedItemId(e.target.value)
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="">Select an item to add...</option>
                              {allInventoryItems
                                .filter((item: any) =>
                                  // Filter out items already in this group
                                  !details.product_group_items?.some((gi: any) => gi.inventory_item_id === item.id)
                                )
                                .map((item: any) => (
                                  <option key={item.id} value={item.id}>
                                    {item.item_name} ({item.item_category})
                                  </option>
                                ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={() => handleAddItemToGroup(group.id)}
                              disabled={!selectedItemId || isAddingItems !== group.id}
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Items List */}
                        {details.product_group_items && details.product_group_items.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                              {details.product_group_items.length} item{details.product_group_items.length !== 1 ? 's' : ''} in this group
                            </p>
                            {details.product_group_items.map((item: any) => (
                              <div key={item.id} className="bg-white rounded p-3 border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm text-gray-900">
                                      {item.inventory_items?.item_name || 'Unknown Item'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {item.inventory_items?.item_category}
                                      {item.inventory_items?.serial_number &&
                                        ` • S/N: ${item.inventory_items.serial_number}`
                                      }
                                      {item.inventory_items?.tracking_type === 'total_quantity' &&
                                        ` • Qty: ${item.inventory_items.total_quantity}`
                                      }
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveItemFromGroup(group.id, item.inventory_item_id)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No items in this group yet</p>
                            <p className="text-xs text-gray-400 mt-1">Use the dropdown above to add items</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Loading items...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
