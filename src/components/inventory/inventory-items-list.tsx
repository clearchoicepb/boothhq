'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react'
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
import { format } from 'date-fns'

export function InventoryItemsList() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setcategoryFilter] = useState<string>('all')
  const [trackingTypeFilter, setTrackingTypeFilter] = useState<string>('all')

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
      item.item_category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || item.item_category === categoryFilter
    const matchesTrackingType = trackingTypeFilter === 'all' || item.tracking_type === trackingTypeFilter

    return matchesSearch && matchesCategory && matchesTrackingType
  })

  const handleSubmit = async (data: any) => {
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
      alert(error.message || 'Failed to save inventory item')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return

    try {
      await deleteItem.mutateAsync(itemId)
    } catch (error: any) {
      alert(error.message || 'Failed to delete inventory item')
    }
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: any) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const formatAssignment = (item: any) => {
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
        {item.assigned_to_type === 'product_group' && (
          <>
            <span>📦</span>
            <span className="text-sm">{name}</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Items</h2>
          <p className="text-gray-600">Manage individual equipment and supplies</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border">
        <div className="flex-1 relative">
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
      ) : filteredItems.length === 0 ? (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial/Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Assigned To</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      {item.model && (
                        <div className="text-xs text-gray-500 mt-0.5">{item.model}</div>
                      )}
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
                    <div className="text-sm text-gray-900">{item.item_category}</div>
                    <div className="text-xs text-gray-500">
                      {item.tracking_type === 'serial_number' ? 'Serial #' : 'Quantity'}
                    </div>
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

      {/* Modal */}
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
    </div>
  )
}
