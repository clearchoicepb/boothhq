/**
 * Shared PDF Utilities
 *
 * Common utilities for PDF generation used across the application.
 * These are extracted from various PDF implementations to DRY up the code.
 */

import type jsPDF from 'jspdf'
import type { PdfPagePosition } from './types'

/**
 * Brand color used throughout the application for PDF headers
 * RGB values: [52, 125, 196] = #347dc4
 */
export const PDF_BRAND_COLOR: [number, number, number] = [52, 125, 196]

/**
 * Default margins for PDF documents (in points)
 */
export const PDF_DEFAULT_MARGIN = 50

/**
 * Load an image from URL and convert to base64 data URI
 *
 * @param url - The URL of the image to load
 * @returns Base64 data URI string or null if loading fails
 */
export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const blob = await response.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Format a number as USD currency
 *
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/**
 * Format a date string for PDF display
 *
 * @param dateString - ISO date string or Date-compatible string
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string (e.g., "December 9, 2025")
 */
export function formatDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions)
}

/**
 * Format a time string to 12-hour format
 *
 * @param time - Time string in HH:MM or HH:MM:SS format
 * @returns Formatted time string (e.g., "2:30 PM") or null if invalid
 */
export function formatTime(time: string | undefined | null): string | null {
  if (!time) return null

  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return null

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Check if a page break is needed and handle it
 *
 * @param doc - The jsPDF document instance
 * @param position - Current page position info
 * @param requiredSpace - Space required for next content (default: 100)
 * @returns Updated y position after potential page break
 */
export function checkPageBreak(
  doc: jsPDF,
  position: PdfPagePosition,
  requiredSpace: number = 100
): number {
  if (position.yPos + requiredSpace > position.pageHeight - position.margin) {
    doc.addPage()
    return position.margin
  }
  return position.yPos
}

/**
 * Add a section header to the PDF
 *
 * @param doc - The jsPDF document instance
 * @param title - Section title text
 * @param yPos - Current y position
 * @param margin - Page margin
 * @param pageWidth - Total page width
 * @returns New y position after header
 */
export function addSectionHeader(
  doc: jsPDF,
  title: string,
  yPos: number,
  margin: number,
  pageWidth: number
): number {
  let y = yPos + 12
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(title.toUpperCase(), margin, y)
  y += 4
  doc.setLineWidth(0.5)
  doc.setDrawColor(204, 204, 204)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10
  return y
}

/**
 * Add a field with label and value to the PDF
 *
 * @param doc - The jsPDF document instance
 * @param label - Field label
 * @param value - Field value
 * @param yPos - Current y position
 * @param margin - Page margin
 * @param contentWidth - Available content width
 * @param indent - Optional indent (default: 10)
 * @returns New y position after field
 */
export function addField(
  doc: jsPDF,
  label: string,
  value: string,
  yPos: number,
  margin: number,
  contentWidth: number,
  indent: number = 10
): number {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(55, 65, 81)
  doc.text(label, margin + indent, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  const valueLines = doc.splitTextToSize(value, contentWidth - 140 - indent)
  doc.text(valueLines, margin + 120, yPos)
  return yPos + Math.max(10, valueLines.length * 10)
}

/**
 * Strip HTML tags and decode common entities
 *
 * @param html - HTML string to clean
 * @returns Plain text string
 */
export function stripHtml(html: string | null): string {
  if (!html) return ''
  let text = html.replace(/<[^>]*>/g, '')
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/\s+/g, ' ')
  return text.trim()
}
