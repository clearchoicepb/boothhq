/**
 * PDF Module
 *
 * Centralized exports for PDF generation utilities, types, and generators.
 */

// Types
export type {
  PdfConfig,
  PdfExportOptions,
  PdfGenerator,
  PdfBrandingInfo,
  PdfSectionStyle,
  PdfPagePosition
} from './types'

// Utilities
export {
  PDF_BRAND_COLOR,
  PDF_DEFAULT_MARGIN,
  loadImageAsBase64,
  formatCurrency,
  formatDate,
  formatTime,
  checkPageBreak,
  addSectionHeader,
  addField,
  stripHtml
} from './utils'

// Generators
export { generateLogisticsPdf, getLogisticsPdfFilename } from './generators/logistics'
