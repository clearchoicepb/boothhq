'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { GripVertical } from 'lucide-react'
import { useSettings } from '@/lib/settings-context'

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  required?: boolean // Required columns can't be hidden
  order: number
}

interface ColumnCustomizationModalProps {
  isOpen: boolean
  onClose: () => void
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

export function ColumnCustomizationModal({
  isOpen,
  onClose,
  columns,
  onColumnsChange
}: ColumnCustomizationModalProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    setLocalColumns(columns)
  }, [columns, isOpen])

  const handleToggleColumn = (id: string) => {
    setLocalColumns(prev =>
      prev.map(col =>
        col.id === id && !col.required ? { ...col, visible: !col.visible } : col
      )
    )
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === index) return

    const newColumns = [...localColumns]
    const draggedColumn = newColumns[draggedIndex]
    newColumns.splice(draggedIndex, 1)
    newColumns.splice(index, 0, draggedColumn)

    // Update order property
    newColumns.forEach((col, i) => {
      col.order = i
    })

    setLocalColumns(newColumns)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSave = () => {
    onColumnsChange(localColumns)
    onClose()
  }

  const handleReset = () => {
    // Reset to default configuration
    const defaultColumns = localColumns.map((col, index) => ({
      ...col,
      visible: true,
      order: index
    }))
    setLocalColumns(defaultColumns)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Columns">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Show, hide, and reorder columns to customize your table view. Drag to reorder.
        </p>

        {/* Column List */}
        <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
          {localColumns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-3 cursor-move
                ${draggedIndex === index ? 'opacity-50' : ''}
                hover:bg-gray-50 transition-colors
              `}
            >
              {/* Drag Handle */}
              <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>

              {/* Checkbox */}
              <input
                type="checkbox"
                checked={column.visible}
                onChange={() => handleToggleColumn(column.id)}
                disabled={column.required}
                className="rounded"
              />

              {/* Column Label */}
              <div className="flex-1">
                <span className={column.visible ? 'text-gray-900' : 'text-gray-400'}>
                  {column.label}
                </span>
                {column.required && (
                  <span className="ml-2 text-xs text-gray-500">(Required)</span>
                )}
              </div>

              {/* Order Indicator */}
              <span className="text-xs text-gray-400">#{index + 1}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Get default column configuration with optional settings overrides
 */
export function getDefaultColumns(settings?: {
  showCost?: boolean
  showLocation?: boolean
  showLastMaintenance?: boolean
}): ColumnConfig[] {
  return [
    { id: 'item_name', label: 'Item Name', visible: true, required: true, order: 0 },
    { id: 'model', label: 'Model', visible: true, order: 1 },
    { id: 'product_group', label: 'Product Group', visible: true, order: 2 },
    { id: 'category', label: 'Category', visible: true, order: 3 },
    { id: 'status', label: 'Status', visible: true, required: true, order: 4 },
    { id: 'serial_qty', label: 'Serial/Qty', visible: true, order: 5 },
    { id: 'value', label: 'Value', visible: settings?.showCost ?? true, order: 6 },
    { id: 'current_location', label: 'Current Location', visible: settings?.showLocation ?? true, order: 7 },
    { id: 'last_maintenance', label: 'Last Maintenance', visible: settings?.showLastMaintenance ?? false, order: 8 },
    { id: 'last_assigned', label: 'Last Assigned To', visible: false, order: 9 },
    { id: 'purchase_date', label: 'Purchase Date', visible: false, order: 10 },
    { id: 'notes', label: 'Notes', visible: false, order: 11 },
    { id: 'actions', label: 'Actions', visible: true, required: true, order: 12 }
  ]
}

// Default column configuration (for backward compatibility)
export const DEFAULT_COLUMNS: ColumnConfig[] = getDefaultColumns()

// Hook to manage column preferences with settings integration
export function useColumnPreferences() {
  const { getSetting } = useSettings()
  const inventorySettings = getSetting('inventory', {})

  // Get default columns based on settings
  const settingsBasedDefaults = getDefaultColumns({
    showCost: inventorySettings.showCost,
    showLocation: inventorySettings.showLocation,
    showLastMaintenance: inventorySettings.showLastMaintenance
  })

  const [columns, setColumns] = useState<ColumnConfig[]>(settingsBasedDefaults)

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('inventory_column_preferences')
    if (stored) {
      try {
        const savedColumns: ColumnConfig[] = JSON.parse(stored)
        // Merge with settings-based defaults to handle new columns and respect settings
        const mergedColumns = settingsBasedDefaults.map(defaultCol => {
          const savedCol = savedColumns.find(c => c.id === defaultCol.id)
          if (savedCol) {
            // Preserve user's order and visibility preference, but respect settings for default visibility
            return {
              ...savedCol,
              // If user hasn't customized, use settings-based default
              visible: savedCol.visible !== undefined ? savedCol.visible : defaultCol.visible
            }
          }
          return defaultCol
        }).sort((a, b) => a.order - b.order)

        setColumns(mergedColumns)
      } catch (error) {
        console.error('Failed to load column preferences:', error)
        setColumns(settingsBasedDefaults)
      }
    } else {
      setColumns(settingsBasedDefaults)
    }
  }, [inventorySettings.showCost, inventorySettings.showLocation, inventorySettings.showLastMaintenance])

  const saveColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns)
    localStorage.setItem('inventory_column_preferences', JSON.stringify(newColumns))
  }

  return { columns, saveColumns }
}
