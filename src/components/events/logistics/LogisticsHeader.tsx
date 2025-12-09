'use client'

import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LogisticsHeaderProps } from '@/types/logistics'

/**
 * LogisticsHeader Component
 *
 * Displays the document header with title, client name, and PDF export button.
 */
export function LogisticsHeader({
  clientName,
  isExporting,
  onExportPdf
}: LogisticsHeaderProps) {
  return (
    <div className="mb-8 pb-4 border-b-2 border-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Logistics</h2>
          {clientName && (
            <p className="text-xl font-semibold text-[#347dc4] mt-2">
              Client: {clientName}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Operational Details & Schedule
          </p>
        </div>
        <Button
          onClick={onExportPdf}
          variant="outline"
          size="sm"
          disabled={isExporting}
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </div>
    </div>
  )
}
