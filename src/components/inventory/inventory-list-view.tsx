'use client'

import { Button } from '@/components/ui/button'
import { Edit, Trash2, Package2, ChevronRight } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { format } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface InventoryListViewProps {
  items: any[]
  onEdit: (item: any) => void
  onDelete: (itemId: string) => void
  bulkMode?: boolean
  selectedItems?: Set<string>
  onToggleSelection?: (itemId: string) => void
}

export function InventoryListView({
  items,
  onEdit,
  onDelete,
  bulkMode,
  selectedItems,
  onToggleSelection
}: InventoryListViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5
  })

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No inventory items found</p>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] overflow-auto bg-white rounded-lg border"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="border-b hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4 p-4 h-full">
                {/* Checkbox */}
                {bulkMode && onToggleSelection && selectedItems && (
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => onToggleSelection(item.id)}
                    className="rounded flex-shrink-0"
                  />
                )}

                {/* Main Content - Flexible Layout */}
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                  {/* Item Name & Model (4 cols) */}
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {item.item_name}
                    </div>
                    {item.model && (
                      <div className="text-sm text-gray-500 truncate">
                        {item.model}
                      </div>
                    )}
                  </div>

                  {/* Category & Group (3 cols) */}
                  <div className="col-span-3 min-w-0">
                    <div className="text-sm text-gray-900 truncate">
                      {item.item_category}
                    </div>
                    {item.product_group_name && (
                      <div className="flex items-center gap-1 text-xs text-purple-700 truncate">
                        <Package2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{item.product_group_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Status (2 cols) */}
                  <div className="col-span-2">
                    <StatusBadge
                      assignmentType={item.assignment_type}
                      assignedToType={item.assigned_to_type}
                      assignedToName={item.assigned_to_name}
                    />
                  </div>

                  {/* Serial/Qty & Value (2 cols) */}
                  <div className="col-span-2 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.tracking_type === 'serial_number'
                        ? item.serial_number
                        : `${item.total_quantity} units`}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${item.item_value?.toLocaleString() || '0'}
                    </div>
                  </div>

                  {/* Actions (1 col) */}
                  <div className="col-span-1 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
