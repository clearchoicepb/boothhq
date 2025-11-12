'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Package2 } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { AssignmentHistory } from './assignment-history'
import { format } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { ColumnConfig } from './column-customization-modal'

interface InventoryTableViewProps {
  items: any[]
  columns: ColumnConfig[]
  onEdit: (item: any) => void
  onDelete: (itemId: string) => void
  bulkMode?: boolean
  selectedItems?: Set<string>
  onToggleSelection?: (itemId: string) => void
  onToggleSelectAll?: () => void
  allSelected?: boolean
}

export function InventoryTableView({
  items,
  columns,
  onEdit,
  onDelete,
  bulkMode,
  selectedItems,
  onToggleSelection,
  onToggleSelectAll,
  allSelected
}: InventoryTableViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10
  })

  // Filter and sort visible columns
  const visibleColumns = columns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)

  const renderCell = (item: any, columnId: string) => {
    switch (columnId) {
      case 'item_name':
        return (
          <div>
            <div className="font-medium text-gray-900">{item.item_name}</div>
            {item.model && (
              <div className="text-xs text-gray-500 mt-0.5">{item.model}</div>
            )}
          </div>
        )

      case 'model':
        return item.model ? (
          <span className="text-sm text-gray-600">{item.model}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )

      case 'product_group':
        return item.product_group_name ? (
          <div className="flex items-center gap-1">
            <Package2 className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">
              {item.product_group_name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No group</span>
        )

      case 'category':
        return (
          <div>
            <div className="text-sm text-gray-900">{item.item_category}</div>
            <div className="text-xs text-gray-500">
              {item.tracking_type === 'serial_number' ? 'Serial #' : 'Quantity'}
            </div>
          </div>
        )

      case 'status':
        return (
          <StatusBadge
            assignmentType={item.assignment_type}
            assignedToType={item.assigned_to_type}
            assignedToName={item.assigned_to_name}
          />
        )

      case 'serial_qty':
        return (
          <div>
            <div className="text-sm text-gray-900">
              {item.tracking_type === 'serial_number'
                ? item.serial_number
                : `${item.total_quantity} units`}
            </div>
          </div>
        )

      case 'value':
        return (
          <div className="text-sm text-gray-900">
            ${item.item_value?.toLocaleString() || '0'}
          </div>
        )

      case 'current_location':
        return (
          <div className="text-sm">
            {item.assigned_to_type && item.assigned_to_id ? (
              <div>
                {item.assigned_to_type === 'user' && (
                  <div className="flex items-center gap-1">
                    <span>👤</span>
                    <span>{item.assigned_to_name}</span>
                  </div>
                )}
                {item.assigned_to_type === 'physical_address' && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{item.assigned_to_name}</span>
                  </div>
                )}
                {item.assigned_to_type === 'product_group' && (
                  <div className="flex items-center gap-1">
                    <Package2 className="h-3.5 w-3.5" />
                    <span>{item.assigned_to_name}</span>
                  </div>
                )}
                {item.expected_return_date && (
                  <div className="text-xs text-gray-500 mt-1">
                    Returns: {format(new Date(item.expected_return_date), 'MMM d')}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400">Unassigned</span>
            )}
          </div>
        )

      case 'last_assigned':
        return item.last_assigned_to ? (
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
        )

      case 'purchase_date':
        return item.purchase_date ? (
          <span className="text-sm text-gray-900">
            {format(new Date(item.purchase_date), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )

      case 'notes':
        return item.item_notes ? (
          <div className="text-xs text-gray-600 line-clamp-2 max-w-xs">
            {item.item_notes}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )

      case 'actions':
        return (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
            <AssignmentHistory
              itemId={item.id}
              itemName={item.item_name}
            />
          </div>
        )

      default:
        return null
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No inventory items found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              {bulkMode && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: 'calc(100vh - 450px)' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          <table className="w-full">
            <tbody>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = items[virtualRow.index]

                return (
                  <tr
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      display: 'table',
                      tableLayout: 'fixed'
                    }}
                    className="hover:bg-gray-50 border-b"
                  >
                    {bulkMode && onToggleSelection && selectedItems && (
                      <td className="px-4 py-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => onToggleSelection(item.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td key={column.id} className="px-6 py-4">
                        {renderCell(item, column.id)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
