/**
 * Shared PDF Types
 *
 * Common type definitions for PDF generation across the application.
 */

import type jsPDF from 'jspdf'

/**
 * PDF document configuration options
 */
export interface PdfConfig {
  /** Page orientation */
  orientation?: 'portrait' | 'landscape'
  /** Measurement unit */
  unit?: 'pt' | 'mm'
  /** Page format/size */
  format?: 'letter' | 'a4'
  /** Page margins */
  margin?: number
}

/**
 * Options for PDF export behavior
 */
export interface PdfExportOptions {
  /** Filename for the downloaded PDF (can be a function for dynamic names) */
  filename: string | (() => string)
  /** Callback when export succeeds */
  onSuccess?: () => void
  /** Callback when export fails */
  onError?: (error: Error) => void
}

/**
 * Function signature for PDF generators
 */
export type PdfGenerator<T = void> = T extends void
  ? () => Promise<jsPDF>
  : (data: T) => Promise<jsPDF>

/**
 * Company/tenant branding information for PDFs
 */
export interface PdfBrandingInfo {
  name?: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
}

/**
 * Common section header styling
 */
export interface PdfSectionStyle {
  fontSize: number
  fontStyle: 'normal' | 'bold' | 'italic'
  textColor: [number, number, number]
  marginTop?: number
  marginBottom?: number
}

/**
 * Page position tracking for PDF rendering
 */
export interface PdfPagePosition {
  yPos: number
  pageWidth: number
  pageHeight: number
  margin: number
}
