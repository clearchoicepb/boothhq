'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { useInventoryItemsData, useUpdateInventoryItem } from '@/hooks/useInventoryItemsData'
import { useQueryClient } from '@tanstack/react-query'
import { ProductGroupItemSelector } from './ProductGroupItemSelector'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('inventory')

export function ProductGroupsList() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'view' | 'add' | null>(null) // Track which mode is active
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null) // For viewing/editing item details

  // Data hooks
  const { data: groups = [], isLoading } = useProductGroupsData()
  // Fetch all inventory items with a high limit to ensure we get everything
  const { data: inventoryResponse } = useInventoryItemsData({ limit: 10000 })
  const allInventoryItems = inventoryResponse?.data || []

  // Fetch users and physical addresses for assignment dropdowns
  const [users, setUsers] = useState<any[]>([])
  const [physicalAddresses, setPhysicalAddresses] = useState<any[]>([])

  useEffect(() => {
    // Fetch users
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => log.error({ err }, 'Failed to fetch users'))

    // Fetch physical addresses
    fetch('/api/physical-addresses')
      .then(res => res.json())
      .then(data => setPhysicalAddresses(data))
      .catch(err => log.error({ err }, 'Failed to fetch physical addresses'))
  }, [])

  // Fetch details for expanded group using React Query
  const { data: groupDetails, isLoading: isLoadingDetails } = useProductGroupData(expandedGroupId || '', {
    enabled: Boolean(expandedGroupId)
  })

  const addGroup = useAddProductGroup()
  const updateGroup = useUpdateProductGroup()
  const deleteGroup = useDeleteProductGroup()
  const addItemToGroup = useAddItemToProductGroup()
  const removeItemFromGroup = useRemoveItemFromProductGroup()
  const updateInventoryItem = useUpdateInventoryItem()

  const handleSubmit = useCallback(async (data: any) => {
    log.debug('Form data:', data)
    log.debug('Editing group:', editingGroup?.id)

    try {
      if (editingGroup) {
        const result = await updateGroup.mutateAsync({ groupId: editingGroup.id, groupData: data })
        log.debug('Update successful:', result)
      } else {
        const result = await addGroup.mutateAsync(data)
        log.debug('Create successful:', result)
      }
      setIsModalOpen(false)
      setEditingGroup(null)
    } catch (error: any) {
      log.error({ error }, '[Product Group Submit] Error occurred')
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
      log.error({ error }, 'Failed to delete product group')
      // Error will be shown by the mutation's error state
    }
  }, [deleteGroup])

  const toggleGroupExpansion = useCallback((groupId: string, mode: 'view' | 'add') => {
    if (expandedGroupId === groupId && viewMode === mode) {
      // If clicking the same button, collapse
      setExpandedGroupId(null)
      setViewMode(null)
    } else {
      // Otherwise expand and set mode
      setExpandedGroupId(groupId)
      setViewMode(mode)
    }
  }, [expandedGroupId, viewMode])

  const openCreateModal = useCallback(() => {
    setEditingGroup(null)
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((group: any) => {
    setEditingGroup(group)
    setIsModalOpen(true)
  }, [])

  const handleAddItemToGroup = useCallback(async (groupId: string, inventoryItemId: string, quantity?: number) => {
    if (!inventoryItemId) return

    try {
      await addItemToGroup.mutateAsync({ groupId, inventoryItemId, quantity })
      // React Query mutations already invalidate the cache
    } catch (error: any) {
      log.error({ error }, 'Failed to add item to group')
      // Error will be shown by the mutation's error state
    }
  }, [addItemToGroup])

  const handleRemoveItemFromGroup = useCallback(async (groupId: string, inventoryItemId: string) => {
    if (!confirm('Remove this item from the group?')) return

    try {
      await removeItemFromGroup.mutateAsync({ groupId, inventoryItemId })
      // React Query mutations already invalidate the cache
    } catch (error: any) {
      log.error({ error }, 'Failed to remove item from group')
      // Error will be shown by the mutation's error state
    }
  }, [removeItemFromGroup])

  const handleInventoryItemSubmit = useCallback(async (data: any) => {
    if (!selectedInventoryItem?.id) return

    try {
      await updateInventoryItem.mutateAsync({ itemId: selectedInventoryItem.id, itemData: data })
      setSelectedInventoryItem(null)
    } catch (error: any) {
      log.error({ error }, 'Failed to update inventory item')
      throw error
    }
  }, [selectedInventoryItem, updateInventoryItem])

  const handleInlineAssignmentChange = useCallback(async (
    groupId: string,
    assignedToType: string,
    assignedToId: string
  ) => {
    log.debug({ groupId, assignedToType, assignedToId }, 'Updating group')

    try {
      await updateGroup.mutateAsync({
        groupId,
        groupData: {
          assigned_to_type: assignedToType,
          assigned_to_id: assignedToId
        }
      })
    } catch (error: any) {
      log.error({ error }, 'Failed to update assignment')
      toast.error('Failed to update assignment: ${error.message}')
    }
  }, [updateGroup])

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
                    {/* Inline Assignment Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getAssignmentIcon(group.assigned_to_type)}
                        <label className="text-xs font-medium text-gray-600">Assign To</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={group.assigned_to_type || ''}
                          onChange={(e) => {
                            const newType = e.target.value
                            if (!newType) return
                            // When changing type, default to first item of new type
                            const defaultId = newType === 'user'
                              ? users[0]?.id
                              : physicalAddresses[0]?.id
                            if (defaultId) {
                              handleInlineAssignmentChange(group.id, newType, defaultId)
                            }
                          }}
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="user">User</option>
                          <option value="physical_address">Location</option>
                        </select>
                        <select
                          value={group.assigned_to_id || ''}
                          onChange={(e) => {
                            const newId = e.target.value
                            if (newId && group.assigned_to_type) {
                              handleInlineAssignmentChange(group.id, group.assigned_to_type, newId)
                            }
                          }}
                          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select...</option>
                          {group.assigned_to_type === 'user'
                            ? users.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name}
                                </option>
                              ))
                            : physicalAddresses.map(addr => (
                                <option key={addr.id} value={addr.id}>
                                  {addr.location_name}
                                </option>
                              ))
                          }
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {group.product_group_items?.length || 0} items
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupExpansion(group.id, 'view')}
                          className={`text-gray-600 hover:text-gray-900 ${
                            isExpanded && viewMode === 'view' ? 'bg-gray-100' : ''
                          }`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Items
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupExpansion(group.id, 'add')}
                          className={`text-gray-600 hover:text-gray-900 ${
                            isExpanded && viewMode === 'add' ? 'bg-gray-100' : ''
                          }`}
                        >
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Add Items
                        </Button>
                      </div>
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

                {/* Expanded Items Content */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    {isLoadingDetails ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Loading items...</p>
                      </div>
                    ) : details ? (
                      <>
                        {/* Add Items Mode */}
                        {viewMode === 'add' && (
                          <ProductGroupItemSelector
                            availableItems={allInventoryItems}
                            excludeItemIds={details.product_group_items?.map((gi: any) => gi.inventory_item_id) || []}
                            onAddItem={(itemId, quantity) => handleAddItemToGroup(group.id, itemId, quantity)}
                            isAdding={addItemToGroup.isPending}
                            currentGroupId={group.id}
                          />
                        )}

                        {/* View Items Mode */}
                        {viewMode === 'view' && (
                          <>
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
                                    <div
                                      key={item.id}
                                      className="bg-white rounded p-3 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                                      onClick={() => setSelectedInventoryItem(item.inventory_items)}
                                    >
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
                                            {item.inventory_items.tracking_type === 'total_quantity' && (
                                              <>
                                                {` • In Group: `}
                                                <span className="font-semibold text-purple-600">{item.quantity || 1}</span>
                                                <span className="text-gray-400"> / {item.inventory_items.total_quantity} total</span>
                                              </>
                                            )}
                                          </p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveItemFromGroup(group.id, item.inventory_item_id)
                                          }}
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
                                <p className="text-xs text-gray-400 mt-1">Click "Add Items" to add items to this group</p>
                              </div>
                            )}
                          </>
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

      {/* Product Group Modal */}
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

      {/* Inventory Item View/Edit Modal */}
      <EntityForm
        entity="inventory_item"
        isOpen={Boolean(selectedInventoryItem)}
        onClose={() => setSelectedInventoryItem(null)}
        onSubmit={handleInventoryItemSubmit}
        initialData={selectedInventoryItem || undefined}
        title="View/Edit Item"
        submitLabel="Update Item"
      />
    </div>
  )
}
