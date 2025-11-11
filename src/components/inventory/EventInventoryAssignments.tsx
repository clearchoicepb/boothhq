'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Package, Plus, Trash2, Search, User, Warehouse, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface InventoryItem {
  id: string
  item_name: string
  item_category: string
  serial_number?: string
  tracking_type: 'serial_number' | 'total_quantity'
  total_quantity?: number
  assigned_to_type?: 'user' | 'physical_address' | 'product_group'
  assigned_to_id?: string
  assigned_to_name?: string
  assignment_type?: 'long_term_staff' | 'event_checkout' | 'warehouse'
  event_id?: string
  expected_return_date?: string
  model?: string
}

interface EventInventoryAssignmentsProps {
  eventId: string
  tenantSubdomain: string
}

export function EventInventoryAssignments({ eventId, tenantSubdomain }: EventInventoryAssignmentsProps) {
  const [assignedItems, setAssignedItems] = useState<InventoryItem[]>([])
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupDetails, setGroupDetails] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchData()
  }, [eventId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch assigned and available inventory
      const inventoryRes = await fetch(`/api/events/${eventId}/inventory?include_available=true`)
      if (inventoryRes.ok) {
        const data = await inventoryRes.json()
        setAssignedItems(data.assigned || [])
        setAvailableItems(data.available || [])
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignItems = async () => {
    if (selectedItems.size === 0) return

    try {
      const response = await fetch(`/api/events/${eventId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_item_ids: Array.from(selectedItems),
          create_checkout_task: true
        })
      })

      if (response.ok) {
        setSelectedItems(new Set())
        setIsAssigning(false)
        setSearchQuery('')
        await fetchData()
      }
    } catch (error) {
      console.error('Error assigning items:', error)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the event?')) return

    try {
      const response = await fetch(`/api/events/${eventId}/inventory?item_ids=${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  const toggleStaffExpanded = (staffId: string) => {
    const newExpanded = new Set(expandedStaff)
    if (newExpanded.has(staffId)) {
      newExpanded.delete(staffId)
    } else {
      newExpanded.add(staffId)
    }
    setExpandedStaff(newExpanded)
  }

  const toggleGroupExpanded = async (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
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
    setExpandedGroups(newExpanded)
  }

  // Filter available items by search query
  const filteredAvailableItems = availableItems.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.item_name.toLowerCase().includes(query) ||
      item.item_category.toLowerCase().includes(query) ||
      (item.serial_number && item.serial_number.toLowerCase().includes(query)) ||
      (item.assigned_to_name && item.assigned_to_name.toLowerCase().includes(query))
    )
  })

  // Group available items by assignment
  const staffItems = filteredAvailableItems.filter((item: InventoryItem) => item.assigned_to_type === 'user')
  const warehouseItems = filteredAvailableItems.filter((item: InventoryItem) => item.assigned_to_type === 'physical_address')
  const unassignedItems = filteredAvailableItems.filter((item: InventoryItem) => !item.assigned_to_id)

  // Group staff items by staff member
  const itemsByStaff = staffItems.reduce((acc: Record<string, { staffName: string; items: InventoryItem[] }>, item: InventoryItem) => {
    const key = item.assigned_to_id || 'unassigned'
    if (!acc[key]) {
      acc[key] = {
        staffName: item.assigned_to_name || 'Unknown Staff',
        items: []
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { staffName: string; items: InventoryItem[] }>)

  // Group assigned items by staff
  const assignedByStaff = assignedItems.reduce((acc: Record<string, { staffName: string; items: InventoryItem[] }>, item: InventoryItem) => {
    if (item.assigned_to_type === 'user' && item.assigned_to_id) {
      const key = item.assigned_to_id
      if (!acc[key]) {
        acc[key] = {
          staffName: item.assigned_to_name || 'Unknown Staff',
          items: []
        }
      }
      acc[key].items.push(item)
    }
    return acc
  }, {} as Record<string, { staffName: string; items: InventoryItem[] }>)

  const renderItemRow = (item: InventoryItem, isSelectable: boolean = false, isAssigned: boolean = false) => {
    const isProductGroup = item.assigned_to_type === 'product_group'
    const isGroupExpanded = isProductGroup && item.assigned_to_id && expandedGroups.has(item.assigned_to_id)
    const groupDetail = isProductGroup && item.assigned_to_id ? groupDetails[item.assigned_to_id] : null

    return (
      <div key={item.id}>
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100">
          <div className="flex items-center space-x-3 flex-1">
            {isSelectable && (
              <input
                type="checkbox"
                checked={selectedItems.has(item.id)}
                onChange={() => toggleItemSelection(item.id)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{item.item_name}</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                  {item.item_category}
                </span>
                {isProductGroup && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                    In Group
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-0.5">
                {item.tracking_type === 'serial_number' && item.serial_number && (
                  <span>S/N: {item.serial_number}</span>
                )}
                {item.tracking_type === 'total_quantity' && item.total_quantity && (
                  <span>Qty: {item.total_quantity}</span>
                )}
                {item.model && <span className="ml-2">Model: {item.model}</span>}
              </div>
              {!isAssigned && item.assigned_to_name && (
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  {item.assigned_to_type === 'user' && <User className="h-3 w-3 mr-1" />}
                  {item.assigned_to_type === 'physical_address' && <Warehouse className="h-3 w-3 mr-1" />}
                  {item.assigned_to_type === 'product_group' && <Package className="h-3 w-3 mr-1" />}
                  {item.assigned_to_name}
                  {item.assignment_type === 'long_term_staff' && (
                    <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      Long-term
                    </span>
                  )}
                  {isProductGroup && item.assigned_to_id && (
                    <button
                      onClick={() => toggleGroupExpanded(item.assigned_to_id!)}
                      className="ml-2 text-purple-600 hover:text-purple-800 underline"
                    >
                      {isGroupExpanded ? 'Hide' : 'View'} group items
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {isAssigned && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemoveItem(item.id)}
              className="ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expanded Product Group Items */}
        {isGroupExpanded && (
          <div className="bg-purple-50 px-6 py-3 border-b border-purple-100">
            {groupDetail ? (
              groupDetail.product_group_items && groupDetail.product_group_items.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-900 mb-2">Items in "{item.assigned_to_name}":</p>
                  {groupDetail.product_group_items.map((groupItem: any) => (
                    <div key={groupItem.id} className="text-xs text-purple-800 pl-4">
                      • {groupItem.inventory_items?.item_name || 'Unknown'}
                      {' '}({groupItem.inventory_items?.item_category})
                      {groupItem.inventory_items?.serial_number && ` - S/N: ${groupItem.inventory_items.serial_number}`}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-purple-600">No items in this group</p>
              )
            ) : (
              <p className="text-xs text-purple-600">Loading group items...</p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading inventory...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Equipment & Inventory</h3>
            <p className="text-sm text-gray-600 mt-1">
              {assignedItems.length} item{assignedItems.length !== 1 ? 's' : ''} assigned to this event
            </p>
          </div>
          {!isAssigning && (
            <Button onClick={() => setIsAssigning(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          )}
        </div>

        {/* Assignment Form */}
        {isAssigning && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Equipment to Assign
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAssigning(false)
                    setSelectedItems(new Set())
                    setSearchQuery('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, category, or serial number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {/* Staff Equipment Section */}
              {Object.keys(itemsByStaff).length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="bg-blue-50 px-3 py-2 flex items-center space-x-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Event Staff Equipment</span>
                    <span className="text-xs text-blue-700">({staffItems.length} items)</span>
                  </div>
                  {Object.entries(itemsByStaff).map(([staffId, { staffName, items }]) => (
                    <div key={staffId}>
                      <div
                        className="flex items-center justify-between px-3 py-2 bg-blue-25 hover:bg-blue-50 cursor-pointer"
                        onClick={() => toggleStaffExpanded(staffId)}
                      >
                        <div className="flex items-center space-x-2">
                          {expandedStaff.has(staffId) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-700">{staffName}</span>
                          <span className="text-xs text-gray-500">({items.length})</span>
                        </div>
                      </div>
                      {expandedStaff.has(staffId) && (
                        <div className="bg-white">
                          {items.map(item => renderItemRow(item, true))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Warehouse Equipment Section */}
              {warehouseItems.length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="bg-green-50 px-3 py-2 flex items-center space-x-2">
                    <Warehouse className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Warehouse Equipment</span>
                    <span className="text-xs text-green-700">({warehouseItems.length} items)</span>
                  </div>
                  {warehouseItems.map(item => renderItemRow(item, true))}
                </div>
              )}

              {/* Unassigned Equipment */}
              {unassignedItems.length > 0 && (
                <div>
                  <div className="bg-gray-50 px-3 py-2 flex items-center space-x-2">
                    <Package className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Unassigned Equipment</span>
                    <span className="text-xs text-gray-700">({unassignedItems.length} items)</span>
                  </div>
                  {unassignedItems.map(item => renderItemRow(item, true))}
                </div>
              )}

              {filteredAvailableItems.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No available equipment found</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Try adjusting your search</p>
                  )}
                </div>
              )}
            </div>

            {selectedItems.size > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </span>
                <Button onClick={handleAssignItems}>
                  Assign to Event
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assigned Equipment List */}
      {assignedItems.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="mb-2">No equipment assigned to this event</p>
          <p className="text-sm">Assign equipment to track what's needed for this event</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {/* Show items grouped by staff if any exist */}
          {Object.keys(assignedByStaff).length > 0 && (
            <div className="p-4 bg-blue-50">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Staff Equipment
              </h4>
              {Object.entries(assignedByStaff).map(([staffId, { staffName, items }]) => (
                <div key={staffId} className="mb-4 last:mb-0">
                  <div className="text-sm font-medium text-gray-700 mb-2 px-3">
                    {staffName} ({items.length} item{items.length !== 1 ? 's' : ''})
                  </div>
                  <div className="bg-white rounded-lg overflow-hidden border border-blue-200">
                    {items.map(item => renderItemRow(item, false, true))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show other assigned items */}
          {assignedItems.filter(item => item.assigned_to_type !== 'user').map(item => (
            <div key={item.id} className="p-4">
              {renderItemRow(item, false, true)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
