'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Download, FileText, Table } from 'lucide-react'
import { ColumnConfig } from './column-customization-modal'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  items: any[]
  columns: ColumnConfig[]
  selectedOnly?: boolean
  selectedCount?: number
}

export function ExportModal({
  isOpen,
  onClose,
  items,
  columns,
  selectedOnly,
  selectedCount
}: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv')
  const [includeAllColumns, setIncludeAllColumns] = useState(true)

  const handleExport = () => {
    const visibleColumns = includeAllColumns
      ? columns
      : columns.filter(col => col.visible)

    if (exportFormat === 'csv') {
      exportToCSV(items, visibleColumns)
    } else {
      exportToExcel(items, visibleColumns)
    }

    onClose()
  }

  const exportToCSV = (data: any[], cols: ColumnConfig[]) => {
    // Sort columns by order
    const sortedCols = cols.filter(c => c.id !== 'actions').sort((a, b) => a.order - b.order)

    // Create CSV header
    const headers = sortedCols.map(col => col.label).join(',')

    // Create CSV rows
    const rows = data.map(item => {
      return sortedCols.map(col => {
        const value = getCellValue(item, col.id)
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    })

    // Combine header and rows
    const csvContent = [headers, ...rows].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToExcel = (data: any[], cols: ColumnConfig[]) => {
    // Sort columns by order
    const sortedCols = cols.filter(c => c.id !== 'actions').sort((a, b) => a.order - b.order)

    // Create HTML table
    const headers = sortedCols.map(col => `<th>${col.label}</th>`).join('')
    const rows = data.map(item => {
      const cells = sortedCols.map(col => `<td>${getCellValue(item, col.id)}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Inventory</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `

    // Create download link
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.xls`
    link.click()
  }

  const getCellValue = (item: any, columnId: string): string => {
    switch (columnId) {
      case 'item_name':
        return item.model ? `${item.item_name} (${item.model})` : item.item_name

      case 'model':
        return item.model || ''

      case 'product_group':
        return item.product_group_name || ''

      case 'category':
        return item.item_category || ''

      case 'status':
        if (!item.assigned_to_type || !item.assigned_to_id) return 'Available'
        if (item.assignment_type === 'long_term_staff') return 'Long-term Staff'
        if (item.assignment_type === 'event_checkout') return 'Event Checkout'
        if (item.assignment_type === 'warehouse') return 'Warehouse'
        if (item.assigned_to_type === 'product_group') return 'In Group'
        if (item.assigned_to_type === 'user') return 'Assigned'
        return item.assigned_to_name || ''

      case 'serial_qty':
        return item.tracking_type === 'serial_number'
          ? item.serial_number || ''
          : `${item.total_quantity || 0} units`

      case 'value':
        return `$${item.item_value?.toLocaleString() || '0'}`

      case 'current_location':
        return item.assigned_to_name || 'Unassigned'

      case 'last_assigned':
        return item.last_assigned_to || ''

      case 'purchase_date':
        return item.purchase_date || ''

      case 'notes':
        return item.item_notes || ''

      default:
        return ''
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Inventory">
      <div className="space-y-6">
        {/* Export Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            {selectedOnly ? (
              <>
                Exporting <strong>{selectedCount}</strong> selected items
              </>
            ) : (
              <>
                Exporting <strong>{items.length}</strong> items
              </>
            )}
          </p>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setExportFormat('csv')}
              className={`
                flex items-center gap-3 p-4 border-2 rounded-lg transition-all
                ${exportFormat === 'csv'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <FileText className="h-6 w-6 text-gray-600" />
              <div className="text-left">
                <div className="font-medium">CSV</div>
                <div className="text-xs text-gray-500">Comma-separated values</div>
              </div>
            </button>

            <button
              onClick={() => setExportFormat('excel')}
              className={`
                flex items-center gap-3 p-4 border-2 rounded-lg transition-all
                ${exportFormat === 'excel'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <Table className="h-6 w-6 text-gray-600" />
              <div className="text-left">
                <div className="font-medium">Excel</div>
                <div className="text-xs text-gray-500">Microsoft Excel format</div>
              </div>
            </button>
          </div>
        </div>

        {/* Column Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Columns to Include
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={includeAllColumns}
                onChange={() => setIncludeAllColumns(true)}
                className="rounded"
              />
              <span className="text-sm">All columns</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!includeAllColumns}
                onChange={() => setIncludeAllColumns(false)}
                className="rounded"
              />
              <span className="text-sm">Only visible columns (from table view)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
