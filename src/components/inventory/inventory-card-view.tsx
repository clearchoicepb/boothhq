'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Package2, DollarSign } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { AssignmentHistory } from './assignment-history'
import { format } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface InventoryCardViewProps {
  items: any[]
  onEdit: (item: any) => void
  onDelete: (itemId: string) => void
  bulkMode?: boolean
  selectedItems?: Set<string>
  onToggleSelection?: (itemId: string) => void
}

export function InventoryCardView({
  items,
  onEdit,
  onDelete,
  bulkMode,
  selectedItems,
  onToggleSelection
}: InventoryCardViewProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Virtual scrolling for cards (3 columns grid)
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(items.length / 3),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Estimated card height
    overscan: 2
  })

  const getRowItems = (rowIndex: number) => {
    const startIndex = rowIndex * 3
    return items.slice(startIndex, startIndex + 3)
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
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = getRowItems(virtualRow.index)

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
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                {rowItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      {/* Header with checkbox */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          {bulkMode && onToggleSelection && selectedItems && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => onToggleSelection(item.id)}
                              className="rounded mb-2"
                            />
                          )}
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {item.item_name}
                          </h3>
                          {item.model && (
                            <p className="text-sm text-gray-600">{item.model}</p>
                          )}
                        </div>
                        <StatusBadge
                          assignmentType={item.assignment_type}
                          assignedToType={item.assigned_to_type}
                          assignedToName={item.assigned_to_name}
                        />
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        {/* Category & Group */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Category:</span>
                          <Badge variant="outline">{item.item_category}</Badge>
                        </div>

                        {item.product_group_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <Package2 className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700 font-medium">
                              {item.product_group_name}
                            </span>
                          </div>
                        )}

                        {/* Serial/Qty */}
                        <div className="text-sm">
                          <span className="text-gray-500">
                            {item.tracking_type === 'serial_number' ? 'Serial:' : 'Quantity:'}
                          </span>
                          <span className="ml-2 font-medium">
                            {item.tracking_type === 'serial_number'
                              ? item.serial_number
                              : `${item.total_quantity} units`}
                          </span>
                        </div>

                        {/* Value */}
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            ${item.item_value?.toLocaleString() || '0'}
                          </span>
                        </div>

                        {/* Current Location */}
                        {item.assigned_to_name && (
                          <div className="text-sm">
                            <span className="text-gray-500">Location:</span>
                            <span className="ml-2">{item.assigned_to_name}</span>
                          </div>
                        )}

                        {/* Expected Return */}
                        {item.expected_return_date && (
                          <div className="text-sm text-orange-600">
                            Returns: {format(new Date(item.expected_return_date), 'MMM d, yyyy')}
                          </div>
                        )}

                        {/* Purchase Date */}
                        {item.purchase_date && (
                          <div className="text-xs text-gray-500">
                            Purchased: {format(new Date(item.purchase_date), 'MMM d, yyyy')}
                          </div>
                        )}

                        {/* Notes Preview */}
                        {item.item_notes && (
                          <div className="text-xs text-gray-600 italic line-clamp-2 mt-2">
                            {item.item_notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <AssignmentHistory
                          itemId={item.id}
                          itemName={item.item_name}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
