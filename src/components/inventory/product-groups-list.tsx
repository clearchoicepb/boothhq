'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Package, Users, MapPin, ChevronDown, ChevronUp, Eye, X, PlusCircle } from 'lucide-react'
import { EntityForm } from '@/components/forms/EntityForm'
import {
  useProductGroupsData,
  useProductGroupData,
  useAddProductGroup,
  useUpdateProductGroup,
  useDeleteProductGroup,
  useAddItemToProductGroup,
  useRemoveItemFromProductGroup
} from '@/hooks/useProductGroupsData'
import { useInventoryItemsData } from '@/hooks/useInventoryItemsData'
import { useQueryClient } from '@tanstack/react-query'

export function ProductGroupsList() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string>('')

  // Data hooks
  const { data: groups = [], isLoading } = useProductGroupsData()
  const { data: inventoryResponse } = useInventoryItemsData()
  const allInventoryItems = inventoryResponse?.data || []

  // Fetch details for expanded group using React Query
  const { data: groupDetails, isLoading: isLoadingDetails } = useProductGroupData(expandedGroupId || '', {
    enabled: Boolean(expandedGroupId)
  })

  const addGroup = useAddProductGroup()
  const updateGroup = useUpdateProductGroup()
  const deleteGroup = useDeleteProductGroup()
  const addItemToGroup = useAddItemToProductGroup()
  const removeItemFromGroup = useRemoveItemFromProductGroup()

  const handleSubmit = useCallback(async (data: any) => {
    console.log('[Product Group Submit] Form data:', data)
    console.log('[Product Group Submit] Editing group:', editingGroup?.id)

    try {
      if (editingGroup) {
        const result = await updateGroup.mutateAsync({ groupId: editingGroup.id, groupData: data })
        console.log('[Product Group Submit] Update successful:', result)
      } else {
        const result = await addGroup.mutateAsync(data)
        console.log('[Product Group Submit] Create successful:', result)
      }
      setIsModalOpen(false)
      setEditingGroup(null)
    } catch (error: any) {
      console.error('[Product Group Submit] Error occurred:', error)
      console.error('[Product Group Submit] Error message:', error.message)
      // Re-throw the error so the BaseForm can handle it
      throw error
    }
  }, [editingGroup, updateGroup, addGroup])

  const handleDelete = useCallback(async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this product group? Items in this group will become unassigned.')) return

    try {
      await deleteGroup.mutateAsync(groupId)
    } catch (error: any) {
      console.error('Failed to delete product group:', error)
      // Error will be shown by the mutation's error state
    }
  }, [deleteGroup])

  const toggleGroupExpansion = useCallback((groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null)
      setSelectedItemId('') // Clear selection when collapsing
    } else {
      setExpandedGroupId(groupId)
      setSelectedItemId('') // Clear selection when switching groups
      // React Query will automatically fetch details when expandedGroupId changes
    }
  }, [expandedGroupId])

  const openCreateModal = useCallback(() => {
    setEditingGroup(null)
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((group: any) => {
    setEditingGroup(group)
    setIsModalOpen(true)
  }, [])

  const handleAddItemToGroup = useCallback(async (groupId: string) => {
    if (!selectedItemId) return

    try {
      await addItemToGroup.mutateAsync({ groupId, inventoryItemId: selectedItemId })
      setSelectedItemId('') // Clear selection after adding
      // React Query mutations already invalidate the cache
    } catch (error: any) {
      console.error('Failed to add item to group:', error)
      // Error will be shown by the mutation's error state
    }
  }, [selectedItemId, addItemToGroup])

  const handleRemoveItemFromGroup = useCallback(async (groupId: string, inventoryItemId: string) => {
    if (!confirm('Remove this item from the group?')) return

    try {
      await removeItemFromGroup.mutateAsync({ groupId, inventoryItemId })
      // React Query mutations already invalidate the cache
    } catch (error: any) {
      console.error('Failed to remove item from group:', error)
      // Error will be shown by the mutation's error state
    }
  }, [removeItemFromGroup])

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
            const details = isExpanded ? groupDetails : null

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
                    {isLoadingDetails ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Loading items...</p>
                      </div>
                    ) : details ? (
                      <>
                        {/* Add Item Section */}
                        <div className="mb-4 bg-white rounded-lg p-3 border border-purple-200">
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedItemId}
                              onChange={(e) => setSelectedItemId(e.target.value)}
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
                              disabled={!selectedItemId || addItemToGroup.isPending}
                            >
                              <PlusCircle className="h-4 w-4 mr-1" />
                              {addItemToGroup.isPending ? 'Adding...' : 'Add'}
                            </Button>
                          </div>
                        </div>

                        {/* Items List */}
                        {details.product_group_items && details.product_group_items.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                              {details.product_group_items.length} item{details.product_group_items.length !== 1 ? 's' : ''} in this group
                            </p>
                            {details.product_group_items.map((item: any) => {
                              // Handle case where inventory item might have been deleted
                              if (!item.inventory_items) {
                                return (
                                  <div key={item.id} className="bg-red-50 rounded p-3 border border-red-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm text-red-900">
                                          Item Not Found (Deleted)
                                        </p>
                                        <p className="text-xs text-red-600">
                                          This item may have been deleted. Remove it from this group.
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
                                )
                              }

                              return (
                                <div key={item.id} className="bg-white rounded p-3 border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm text-gray-900">
                                        {item.inventory_items.item_name || 'Unknown Item'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item.inventory_items.item_category}
                                        {item.inventory_items.serial_number &&
                                          ` • S/N: ${item.inventory_items.serial_number}`
                                        }
                                        {item.inventory_items.tracking_type === 'total_quantity' &&
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
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No items in this group yet</p>
                            <p className="text-xs text-gray-400 mt-1">Use the dropdown above to add items</p>
                          </div>
                        )}
                      </>
                    ) : null}
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
