'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Plus, CheckSquare, Square, RotateCcw, Printer, Download, Settings, Grid3x3, List, Table, Bookmark } from 'lucide-react'
import { EntityForm } from '@/components/forms/EntityForm'
import {
  useInventoryItemsData,
  useAddInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  InventoryItemsFilter
} from '@/hooks/useInventoryItemsData'
import { useItemCategoriesData } from '@/hooks/useItemCategoriesData'
import { usePhysicalAddressesData } from '@/hooks/usePhysicalAddressesData'
import { useProductGroupsData } from '@/hooks/useProductGroupsData'
import { useTenantUsers } from '@/hooks/useTenantUsers'
import { BulkCheckoutModal } from './bulk-checkout-modal'
import { InventoryFilters, InventoryFilterState } from './inventory-filters'
import { SavedViewsModal, useDefaultView } from './saved-views-modal'
import { ColumnCustomizationModal, useColumnPreferences } from './column-customization-modal'
import { ExportModal } from './export-modal'
import { InventoryTableView } from './inventory-table-view'
import { InventoryCardView } from './inventory-card-view'
import { InventoryListView } from './inventory-list-view'

type ViewMode = 'table' | 'card' | 'list'

export function InventoryItemsListEnterprise() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const { columns, saveColumns } = useColumnPreferences()
  const defaultView = useDefaultView()

  // Filter state
  const [filters, setFilters] = useState<InventoryFilterState>({
    page: 1,
    limit: 50,
    sort: 'item_name',
    order: 'asc',
    ...defaultView
  })

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isBulkCheckoutModalOpen, setIsBulkCheckoutModalOpen] = useState(false)
  const [isSavedViewsModalOpen, setIsSavedViewsModalOpen] = useState(false)
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectAllPages, setSelectAllPages] = useState(false)

  // Data hooks
  const { data: response, isLoading } = useInventoryItemsData(filters)
  const { data: categories = [] } = useItemCategoriesData()
  const { data: productGroups = [] } = useProductGroupsData()
  const { data: physicalAddresses = [] } = usePhysicalAddressesData()
  const { data: tenantUsers = [] } = useTenantUsers()

  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const deleteItem = useDeleteInventoryItem()

  // Extract data and pagination
  const items = response?.data || []
  const pagination = response?.pagination || {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  }

  // Calculate counts for filter badges
  const counts = {
    total: pagination.total,
    available: 0, // TODO: Get from API or calculate
    checkedOut: 0,
    longTerm: 0,
    dueThisWeek: 0
  }

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
    if (selectedItems.size === items.length && items.length > 0) {
      setSelectedItems(new Set())
      setSelectAllPages(false)
    } else {
      setSelectedItems(new Set(items.map((item: any) => item.id)))
      setSelectAllPages(false)
    }
  }, [selectedItems.size, items])

  const selectAcrossAllPages = useCallback(() => {
    setSelectAllPages(true)
    setSelectedItems(new Set(items.map((item: any) => item.id)))
  }, [items])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedItems(new Set())
    setSelectAllPages(false)
  }, [filters.page, filters.search, filters.status, filters.category])

  // CRUD handlers
  const handleSubmit = useCallback(async (data: any) => {
    try {
      if (editingItem) {
        await updateItem.mutateAsync({ itemId: editingItem.id, itemData: data })
      } else {
        await addItem.mutateAsync(data)
      }
      setIsFormModalOpen(false)
      setEditingItem(null)
    } catch (error: any) {
      console.error('Failed to save inventory item:', error)
      alert(`Failed to save: ${error.message}`)
    }
  }, [editingItem, updateItem, addItem])

  const handleDelete = useCallback(async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return

    try {
      await deleteItem.mutateAsync(itemId)
    } catch (error: any) {
      console.error('Failed to delete inventory item:', error)
    }
  }, [deleteItem])

  const openCreateModal = useCallback(() => {
    setEditingItem(null)
    setIsFormModalOpen(true)
  }, [])

  const openEditModal = useCallback((item: any) => {
    setEditingItem(item)
    setIsFormModalOpen(true)
  }, [])

  // Bulk actions
  const handleBulkReturn = useCallback(async () => {
    if (selectedItems.size === 0) return

    const itemsToReturn = selectAllPages ? pagination.total : selectedItems.size
    if (!confirm(`Mark ${itemsToReturn} item(s) as returned?`)) return

    try {
      // If selecting all pages, we'd need a bulk API endpoint
      // For now, process selected items on current page
      for (const itemId of selectedItems) {
        const item = items.find((i: any) => i.id === itemId)
        if (item) {
          await updateItem.mutateAsync({
            itemId,
            itemData: {
              assigned_to_type: 'physical_address',
              assigned_to_id: item.assigned_to_id,
              assignment_type: 'warehouse',
              event_id: null,
              expected_return_date: null
            }
          })
        }
      }
      setSelectedItems(new Set())
      setSelectAllPages(false)
      setBulkMode(false)
    } catch (error: any) {
      console.error('Failed to mark items as returned:', error)
    }
  }, [selectedItems, selectAllPages, pagination.total, items, updateItem])

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
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inventory Items</h2>
          <p className="text-gray-600">
            {pagination.total.toLocaleString()} total items
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSavedViewsModalOpen(true)}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Views
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {viewMode === 'table' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnModalOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>
          )}
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setBulkMode(!bulkMode)
              setSelectedItems(new Set())
              setSelectAllPages(false)
            }}
          >
            {bulkMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            Bulk
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-blue-900 font-medium">
                {selectAllPages
                  ? `All ${pagination.total} items selected`
                  : `${selectedItems.size} item(s) selected on this page`}
              </span>
              {!selectAllPages && selectedItems.size === items.length && pagination.totalPages > 1 && (
                <button
                  onClick={selectAcrossAllPages}
                  className="ml-3 text-sm text-blue-700 underline hover:text-blue-800"
                >
                  Select all {pagination.total} items across all pages
                </button>
              )}
            </div>
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
                onClick={() => setIsBulkCheckoutModalOpen(true)}
              >
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <InventoryFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        productGroups={productGroups}
        users={tenantUsers}
        physicalAddresses={physicalAddresses}
        onSaveView={() => setIsSavedViewsModalOpen(true)}
        counts={counts}
      />

      {/* View Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-white rounded-lg border p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Card
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>

        {/* Pagination Info */}
        <div className="text-sm text-gray-600">
          Showing {items.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          Loading inventory items...
        </div>
      ) : (
        <>
          {/* Views */}
          {viewMode === 'table' && (
            <InventoryTableView
              items={items}
              columns={columns}
              onEdit={openEditModal}
              onDelete={handleDelete}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onToggleSelection={toggleItemSelection}
              onToggleSelectAll={toggleSelectAll}
              allSelected={selectedItems.size === items.length && items.length > 0}
            />
          )}

          {viewMode === 'card' && (
            <InventoryCardView
              items={items}
              onEdit={openEditModal}
              onDelete={handleDelete}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onToggleSelection={toggleItemSelection}
            />
          )}

          {viewMode === 'list' && (
            <InventoryListView
              items={items}
              onEdit={openEditModal}
              onDelete={handleDelete}
              bulkMode={bulkMode}
              selectedItems={selectedItems}
              onToggleSelection={toggleItemSelection}
            />
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          )}
        </>
      )}

      {/* Modals */}
      <EntityForm
        entity="inventory_item"
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSubmit}
        initialData={editingItem || undefined}
        title={editingItem ? 'Edit Inventory Item' : 'New Inventory Item'}
        submitLabel={editingItem ? 'Update Item' : 'Create Item'}
      />

      <BulkCheckoutModal
        isOpen={isBulkCheckoutModalOpen}
        onClose={() => {
          setIsBulkCheckoutModalOpen(false)
          setSelectedItems(new Set())
          setSelectAllPages(false)
          setBulkMode(false)
        }}
        items={items.filter((item: any) => selectedItems.has(item.id))}
      />

      <SavedViewsModal
        isOpen={isSavedViewsModalOpen}
        onClose={() => setIsSavedViewsModalOpen(false)}
        currentFilters={filters}
        onApplyView={(viewFilters) => setFilters({ ...filters, ...viewFilters, page: 1 })}
      />

      <ColumnCustomizationModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columns={columns}
        onColumnsChange={saveColumns}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={selectAllPages ? items : items.filter((item: any) => selectedItems.has(item.id) || selectedItems.size === 0)}
        columns={columns}
        selectedOnly={selectedItems.size > 0}
        selectedCount={selectAllPages ? pagination.total : selectedItems.size}
      />
    </div>
  )
}
