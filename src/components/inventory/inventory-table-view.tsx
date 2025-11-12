'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Package2, ChevronDown, ChevronRight } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { AssignmentHistory } from './assignment-history'
import { format } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { ColumnConfig } from './column-customization-modal'
import { GroupedInventorySection } from './inventory-grouping'

interface InventoryTableViewProps {
  sections: GroupedInventorySection[]
  columns: ColumnConfig[]
  onEdit: (item: any) => void
  onDelete: (itemId: string) => void
  bulkMode?: boolean
  selectedItems?: Set<string>
  onToggleSelection?: (itemId: string) => void
  onToggleSelectAll?: () => void
  allSelected?: boolean
}

type VirtualRow =
  | { type: 'header'; section: GroupedInventorySection; sectionIndex: number }
  | { type: 'item'; item: any; sectionIndex: number }

export function InventoryTableView({
  sections,
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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Flatten sections into rows for virtual scrolling
  const virtualRows = useMemo(() => {
    const rows: VirtualRow[] = []
    sections.forEach((section, sectionIndex) => {
      // Add section header
      rows.push({ type: 'header', section, sectionIndex })

      // Add items if not collapsed
      if (!collapsedSections.has(section.id)) {
        section.items.forEach(item => {
          rows.push({ type: 'item', item, sectionIndex })
        })
      }
    })
    return rows
  }, [sections, collapsedSections])

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = virtualRows[index]
      return row.type === 'header' ? 48 : 72
    },
    overscan: 10
  })

  // Filter and sort visible columns
  const visibleColumns = columns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order)

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const toggleAllSections = () => {
    if (collapsedSections.size === sections.length) {
      // All collapsed, expand all
      setCollapsedSections(new Set())
    } else {
      // Some or none collapsed, collapse all
      setCollapsedSections(new Set(sections.map(s => s.id)))
    }
  }

  // Get unique locations for a product group
  const getGroupLocations = (section: GroupedInventorySection): string => {
    if (section.type !== 'product_group') return ''

    const locations = new Set<string>()
    section.items.forEach(item => {
      if (item.assigned_to_name) {
        locations.add(item.assigned_to_name)
      }
    })

    if (locations.size === 0) return 'No location'
    if (locations.size === 1) return Array.from(locations)[0]
    return `${locations.size} locations`
  }

  // Calculate column flex properties for responsive sizing
  const getColumnStyle = (columnId: string): React.CSSProperties => {
    switch (columnId) {
      case 'item_name': return { flex: '1 1 140px', minWidth: '120px' }
      case 'model': return { flex: '0.8 1 120px', minWidth: '100px' }
      case 'product_group': return { flex: '1.2 1 150px', minWidth: '130px' }
      case 'category': return { flex: '1.1 1 170px', minWidth: '150px' }
      case 'status': return { flex: '1 1 150px', minWidth: '130px' }
      case 'serial_qty': return { flex: '0.8 1 110px', minWidth: '100px' }
      case 'value': return { flex: '0.6 1 90px', minWidth: '80px' }
      case 'current_location': return { flex: '1.2 1 160px', minWidth: '140px' }
      case 'last_assigned': return { flex: '1 1 140px', minWidth: '120px' }
      case 'purchase_date': return { flex: '0.8 1 110px', minWidth: '100px' }
      case 'notes': return { flex: '1.4 1 180px', minWidth: '150px' }
      case 'actions': return { flex: '0 0 120px', minWidth: '120px' }
      default: return { flex: '1 1 120px', minWidth: '100px' }
    }
  }

  const renderCell = (item: any, columnId: string) => {
    switch (columnId) {
      case 'item_name':
        return (
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{item.item_name}</div>
            {item.model && (
              <div className="text-xs text-gray-500 mt-0.5 truncate">{item.model}</div>
            )}
          </div>
        )

      case 'model':
        return item.model ? (
          <span className="text-sm text-gray-600 truncate block">{item.model}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )

      case 'product_group':
        return item.product_group_name ? (
          <div className="flex items-center gap-1 min-w-0">
            <Package2 className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
            <span className="text-sm text-purple-700 font-medium truncate">
              {item.product_group_name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )

      case 'category':
        return (
          <div className="min-w-0">
            <div className="text-sm text-gray-900 truncate">{item.item_category}</div>
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
          <div className="text-sm text-gray-900 truncate">
            {item.tracking_type === 'serial_number'
              ? item.serial_number
              : `${item.total_quantity} units`}
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
          <div className="text-sm min-w-0">
            {item.assigned_to_type && item.assigned_to_id ? (
              <div>
                {item.assigned_to_type === 'user' && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="flex-shrink-0">👤</span>
                    <span className="truncate">{item.assigned_to_name}</span>
                  </div>
                )}
                {item.assigned_to_type === 'physical_address' && (
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="flex-shrink-0">📍</span>
                    <span className="truncate">{item.assigned_to_name}</span>
                  </div>
                )}
                {item.assigned_to_type === 'product_group' && (
                  <div className="flex items-center gap-1 min-w-0">
                    <Package2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.assigned_to_name}</span>
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
          <div className="min-w-0">
            <div className="text-sm text-gray-600 truncate">{item.last_assigned_to}</div>
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
          <div className="text-xs text-gray-600 line-clamp-2">
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

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No inventory items found</p>
      </div>
    )
  }

  const getSectionIcon = (type: string) => {
    if (type === 'product_group') return <Package2 className="h-4 w-4" />
    if (type === 'location') return <span className="text-base">👤</span>
    return <span className="text-base">📦</span>
  }

  const getSectionColor = (type: string) => {
    if (type === 'product_group') return 'bg-purple-50 border-purple-200 text-purple-900'
    if (type === 'location') return 'bg-blue-50 border-blue-200 text-blue-900'
    return 'bg-gray-50 border-gray-200 text-gray-900'
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Toggle All Button */}
      <div className="border-b bg-gray-50 px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllSections}
          className="text-xs"
        >
          {collapsedSections.size === sections.length ? 'Expand All Groups' : 'Collapse All Groups'}
        </Button>
      </div>

      {/* Table Header */}
      <div className="border-b bg-gray-50 sticky top-0 z-20">
        <div className="flex items-center min-w-full">
          {bulkMode && (
            <div className="px-4 py-3 flex-shrink-0" style={{ width: '60px' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="rounded"
              />
            </div>
          )}
          {visibleColumns.map((column) => (
            <div
              key={column.id}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              style={getColumnStyle(column.id)}
            >
              {column.label}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body with Sections */}
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
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = virtualRows[virtualRow.index]

            if (row.type === 'header') {
              const isCollapsed = collapsedSections.has(row.section.id)
              const itemCount = row.section.items.length

              return (
                <div
                  key={virtualRow.key}
                  className={`flex items-center border-b cursor-pointer sticky z-10 ${getSectionColor(row.section.type)}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  onClick={() => toggleSection(row.section.id)}
                >
                  <div className="flex items-center gap-3 px-4 py-3 font-semibold w-full">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                    )}
                    {getSectionIcon(row.section.type)}
                    <span className="flex-1">
                      {row.section.title}
                      {row.section.type === 'product_group' && (
                        <span className="ml-3 text-sm font-normal opacity-75">
                          @ {getGroupLocations(row.section)}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-normal opacity-75">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )
            }

            // Item row
            const item = row.item

            return (
              <div
                key={virtualRow.key}
                className="flex items-center border-b hover:bg-gray-50 transition-colors min-w-full"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {bulkMode && onToggleSelection && selectedItems && (
                  <div className="px-4 py-4 flex-shrink-0" style={{ width: '60px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => onToggleSelection(item.id)}
                      className="rounded"
                    />
                  </div>
                )}
                {visibleColumns.map((column) => (
                  <div
                    key={column.id}
                    className="px-4 py-4 overflow-hidden"
                    style={getColumnStyle(column.id)}
                  >
                    {renderCell(item, column.id)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
