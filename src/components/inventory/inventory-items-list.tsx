'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Search, Filter, CheckSquare, Square, Package2, RotateCcw, Printer } from 'lucide-react'
import { EntityForm } from '@/components/forms/EntityForm'
import {
  useInventoryItemsData,
  useAddInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem
} from '@/hooks/useInventoryItemsData'
import { useItemCategoriesData } from '@/hooks/useItemCategoriesData'
import { usePhysicalAddressesData } from '@/hooks/usePhysicalAddressesData'
import { useProductGroupsData } from '@/hooks/useProductGroupsData'
import { StatusBadge } from './status-badge'
import { AssignmentHistory } from './assignment-history'
import { BulkCheckoutModal } from './bulk-checkout-modal'
import { format, isWithinInterval, addDays, startOfWeek, endOfWeek } from 'date-fns'

export function InventoryItemsList() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setcategoryFilter] = useState<string>('all')
  const [trackingTypeFilter, setTrackingTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBulkCheckoutModalOpen, setIsBulkCheckoutModalOpen] = useState(false)

  // Data hooks
  const { data: items = [], isLoading } = useInventoryItemsData()
  const { data: categories = [] } = useItemCategoriesData()
  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const deleteItem = useDeleteInventoryItem()

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = searchTerm === '' ||
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_group_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || item.item_category === categoryFilter
    const matchesTrackingType = trackingTypeFilter === 'all' || item.tracking_type === trackingTypeFilter

    // Status filter logic
    let matchesStatus = true
    if (statusFilter === 'available') {
      matchesStatus = !item.assigned_to_id || item.assignment_type === 'warehouse'
    } else if (statusFilter === 'due_this_week') {
      if (item.expected_return_date) {
        const returnDate = new Date(item.expected_return_date)
        const today = new Date()
        const weekEnd = endOfWeek(today)
        matchesStatus = returnDate >= today && returnDate <= weekEnd
      } else {
        matchesStatus = false
      }
    } else if (statusFilter === 'checked_out') {
      matchesStatus = item.assignment_type === 'event_checkout'
    } else if (statusFilter === 'long_term') {
      matchesStatus = item.assignment_type === 'long_term_staff'
    }

    return matchesSearch && matchesCategory && matchesTrackingType && matchesStatus
  })

  // Sort and group items: by product group, then category, then item name
  const sortedAndGroupedItems = [...filteredItems].sort((a: any, b: any) => {
    // First, group by product group (items without group come last)
    const groupA = a.product_group_name || 'zzz_no_group'
    const groupB = b.product_group_name || 'zzz_no_group'
    if (groupA !== groupB) {
      return groupA.localeCompare(groupB)
    }

    // Then by category
    if (a.item_category !== b.item_category) {
      return a.item_category.localeCompare(b.item_category)
    }

    // Finally by item name
    return a.item_name.localeCompare(b.item_name)
  })

  // Bulk selection handlers
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId)
      } else {
        newSelected.add(itemId)
      }
      return newSelected
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === sortedAndGroupedItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(sortedAndGroupedItems.map((item: any) => item.id)))
    }
  }, [selectedItems.size, sortedAndGroupedItems])

  const handleBulkCheckout = useCallback(() => {
    if (selectedItems.size === 0) return
    setIsBulkCheckoutModalOpen(true)
  }, [selectedItems.size])

  const handleBulkReturn = useCallback(async () => {
    if (selectedItems.size === 0) return

    if (!confirm(`Mark ${selectedItems.size} items as returned?`)) return

    try {
      for (const itemId of selectedItems) {
        const item = items.find((i: any) => i.id === itemId)
        if (item) {
          await updateItem.mutateAsync({
            itemId,
            itemData: {
              assigned_to_type: 'physical_address',
              assigned_to_id: item.assigned_to_id, // Keep same warehouse if was assigned to one
              assignment_type: 'warehouse',
              event_id: null,
              expected_return_date: null
            }
          })
        }
      }
      setSelectedItems(new Set())
      setBulkMode(false)
    } catch (error: any) {
      console.error('Failed to mark items as returned:', error)
      // Error will be shown by the mutation's error state
    }
  }, [selectedItems, items, updateItem])

  const handlePrintPackingList = useCallback(() => {
    if (selectedItems.size === 0) return

    const selectedItemsData = items.filter((item: any) => selectedItems.has(item.id))

    // Create printable content
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Packing List</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; }
          .checkbox { width: 30px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Equipment Packing List</h1>
        <p><strong>Date:</strong> ${format(new Date(), 'MMM d, yyyy')}</p>
        <p><strong>Total Items:</strong> ${selectedItemsData.length}</p>
        <table>
          <thead>
            <tr>
              <th class="checkbox">☐</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Serial / Qty</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${selectedItemsData.map((item: any) => `
              <tr>
                <td class="checkbox">☐</td>
                <td>${item.item_name}${item.model ? ` (${item.model})` : ''}</td>
                <td>${item.item_category}</td>
                <td>${item.tracking_type === 'serial_number' ? item.serial_number : `${item.total_quantity} units`}</td>
                <td>${item.item_notes || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Print</button>
      </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
  }, [selectedItems, items])

  const handleSubmit = useCallback(async (data: any) => {
    try {
      if (editingItem) {
        await updateItem.mutateAsync({ itemId: editingItem.id, itemData: data })
      } else {
        await addItem.mutateAsync(data)
      }
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (error: any) {
      console.error('Failed to save inventory item:', error)
      // Show user-friendly error
      alert(`Failed to save: ${error.message}`)
    }
  }, [editingItem, updateItem, addItem])

  const handleDelete = useCallback(async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return

    try {
      await deleteItem.mutateAsync(itemId)
    } catch (error: any) {
      console.error('Failed to delete inventory item:', error)
      // Error will be shown by the mutation's error state
    }
  }, [deleteItem])

  const openCreateModal = useCallback(() => {
    setEditingItem(null)
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((item: any) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }, [])

  const formatAssignment = useCallback((item: any) => {
    if (!item.assigned_to_type || !item.assigned_to_id) {
      return <span className="text-gray-400">Unassigned</span>
    }

    const name = item.assigned_to_name || 'Unknown'

    return (
      <div className="flex items-center gap-2">
        {item.assigned_to_type === 'user' && (
          <>
            <span>👤</span>
            <span className="text-sm">{name}</span>
          </>
        )}
        {item.assigned_to_type === 'physical_address' && (
          <>
            <span>📍</span>
            <span className="text-sm">{name}</span>
          </>
        )}
      </div>
    )
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Items</h2>
          <p className="text-gray-600">Manage individual equipment and supplies</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={() => {
              setBulkMode(!bulkMode)
              setSelectedItems(new Set())
            }}
          >
            {bulkMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {bulkMode && selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-900 font-medium">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintPackingList}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print List
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkReturn}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Mark Returned
              </Button>
              <Button
                size="sm"
                onClick={handleBulkCheckout}
              >
                <Package2 className="h-4 w-4 mr-2" />
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="checked_out">Event Checkout</option>
          <option value="long_term">Long-term Staff</option>
          <option value="due_this_week">Due Back This Week</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setcategoryFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Categories</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.category_name}>
              {cat.category_name}
            </option>
          ))}
        </select>

        <select
          value={trackingTypeFilter}
          onChange={(e) => setTrackingTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Tracking Types</option>
          <option value="serial_number">Serial Number</option>
          <option value="total_quantity">Total Quantity</option>
        </select>
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="text-center py-12">Loading inventory items...</div>
      ) : sortedAndGroupedItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No inventory items found</p>
          <Button onClick={openCreateModal} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {bulkMode && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === sortedAndGroupedItems.length && sortedAndGroupedItems.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial/Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Assigned To</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedAndGroupedItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {bulkMode && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      {item.model && (
                        <div className="text-xs text-gray-500 mt-0.5">{item.model}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.product_group_name ? (
                      <div className="flex items-center gap-1">
                        <Package2 className="h-3.5 w-3.5 text-purple-600" />
                        <span className="text-sm text-purple-700 font-medium">{item.product_group_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No group</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.item_category}</div>
                    <div className="text-xs text-gray-500">
                      {item.tracking_type === 'serial_number' ? 'Serial #' : 'Quantity'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      assignmentType={item.assignment_type}
                      assignedToType={item.assigned_to_type}
                      assignedToName={item.assigned_to_name}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {item.tracking_type === 'serial_number'
                        ? item.serial_number
                        : `${item.total_quantity} units`}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${item.item_value?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {formatAssignment(item)}
                    </div>
                    {item.expected_return_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        Returns: {format(new Date(item.expected_return_date), 'MMM d')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.last_assigned_to ? (
                      <div>
                        <div className="text-sm text-gray-600">{item.last_assigned_to}</div>
                        {item.last_changed_at && (
                          <div className="text-xs text-gray-400">
                            {format(new Date(item.last_changed_at), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No history</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                      <AssignmentHistory
                        itemId={item.id}
                        itemName={item.item_name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      <EntityForm
        entity="inventory_item"
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingItem || undefined}
        title={editingItem ? 'Edit Inventory Item' : 'New Inventory Item'}
        submitLabel={editingItem ? 'Update Item' : 'Create Item'}
      />

      {/* Bulk Checkout Modal */}
      <BulkCheckoutModal
        isOpen={isBulkCheckoutModalOpen}
        onClose={() => {
          setIsBulkCheckoutModalOpen(false)
          setSelectedItems(new Set())
          setBulkMode(false)
        }}
        items={items.filter((item: any) => selectedItems.has(item.id))}
      />
    </div>
  )
}
