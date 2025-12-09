/**
 * usePdfExport Hook
 *
 * Shared hook for handling PDF export functionality across the application.
 * Provides consistent loading state, error handling, and download behavior.
 */

import { useState, useCallback } from 'react'
import type jsPDF from 'jspdf'

export interface UsePdfExportOptions {
  /** Filename for the downloaded PDF (can be a function for dynamic names) */
  filename: string | (() => string)
  /** Function that generates the PDF document */
  generator: () => Promise<jsPDF>
  /** Callback when export succeeds */
  onSuccess?: () => void
  /** Callback when export fails */
  onError?: (error: Error) => void
}

export interface UsePdfExportReturn {
  /** Trigger the PDF export */
  exportPdf: () => Promise<void>
  /** Whether export is currently in progress */
  isExporting: boolean
  /** Error from last export attempt, if any */
  error: Error | null
  /** Clear any existing error */
  clearError: () => void
}

/**
 * Hook for managing PDF export state and behavior
 *
 * @example
 * ```tsx
 * const { exportPdf, isExporting, error } = usePdfExport({
 *   filename: 'my-document.pdf',
 *   generator: async () => {
 *     const doc = new jsPDF()
 *     doc.text('Hello World', 10, 10)
 *     return doc
 *   },
 *   onSuccess: () => toast.success('PDF downloaded!'),
 *   onError: (err) => toast.error(`Failed: ${err.message}`)
 * })
 *
 * return (
 *   <Button onClick={exportPdf} disabled={isExporting}>
 *     {isExporting ? 'Exporting...' : 'Export PDF'}
 *   </Button>
 * )
 * ```
 */
export function usePdfExport(options: UsePdfExportOptions): UsePdfExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const exportPdf = useCallback(async () => {
    setIsExporting(true)
    setError(null)

    try {
      // Generate the PDF document
      const doc = await options.generator()

      // Determine filename
      const filename = typeof options.filename === 'function'
        ? options.filename()
        : options.filename

      // Ensure filename ends with .pdf
      const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`

      // Trigger download
      doc.save(finalFilename)

      // Call success callback if provided
      options.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to export PDF')
      setError(error)
      options.onError?.(error)
    } finally {
      setIsExporting(false)
    }
  }, [options])

  return {
    exportPdf,
    isExporting,
    error,
    clearError
  }
}
