/**
 * Logistics PDF Generator
 *
 * Generates PDF documents for event logistics sheets.
 */

import jsPDF from 'jspdf'
import type { LogisticsData, LogisticsLocation } from '@/types/logistics'
import { PDF_BRAND_COLOR, formatTime as sharedFormatTime } from '../utils'

/**
 * Format a location into a multi-line address string
 */
function formatAddress(location: LogisticsLocation | undefined): string | null {
  if (!location) return null

  const parts: string[] = []

  if (location.address_line1) parts.push(location.address_line1)
  if (location.address_line2) parts.push(location.address_line2)

  const cityStateZip = [
    location.city,
    location.state,
    location.postal_code
  ].filter(Boolean).join(', ')

  if (cityStateZip) parts.push(cityStateZip)
  if (location.country && location.country !== 'US') parts.push(location.country)

  return parts.length > 0 ? parts.join('\n') : null
}

/**
 * Format time for PDF display (wrapper for shared utility)
 */
function formatTime(time: string | undefined): string {
  return sharedFormatTime(time) || time || ''
}

/**
 * Generate a logistics PDF document
 *
 * @param logistics - The logistics data to render
 * @returns Promise resolving to the jsPDF document
 */
export async function generateLogisticsPdf(logistics: LogisticsData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'pt', 'letter')

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 50
  const contentWidth = pageWidth - (margin * 2)
  let yPos = margin

  // Helper to add a section header
  const addSection = (title: string) => {
    yPos += 12
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#000000')
    doc.text(title.toUpperCase(), margin, yPos)
    yPos += 4
    doc.setLineWidth(0.5)
    doc.setDrawColor('#cccccc')
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10
  }

  // Helper to add a field with label and value
  const addField = (label: string, value: string, indent: number = 10) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#374151')
    doc.text(label, margin + indent, yPos)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#000000')
    const valueLines = doc.splitTextToSize(value, contentWidth - 140 - indent)
    doc.text(valueLines, margin + 120, yPos)
    yPos += Math.max(10, valueLines.length * 10)
  }

  // Helper to check for page break
  const checkPageBreak = (requiredSpace: number = 100) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#000000')
  doc.text('Event Logistics', margin, yPos)
  yPos += 18

  // Client name
  if (logistics.client_name) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(`rgb(${PDF_BRAND_COLOR.join(',')})`)
    doc.text(`Client: ${logistics.client_name}`, margin, yPos)
    yPos += 12
  }

  // Subtitle
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#6b7280')
  doc.text('Operational Details & Schedule', margin, yPos)
  yPos += 15

  // Event Schedule Section
  addSection('Event Schedule')
  if (logistics.event_date) {
    const eventDate = new Date(logistics.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    addField('Date:', eventDate)
  }
  if (logistics.load_in_time) {
    addField('Setup Time:', formatTime(logistics.load_in_time))
  }
  if (logistics.start_time) {
    addField('Start Time:', formatTime(logistics.start_time))
  }
  if (logistics.end_time) {
    addField('End Time:', formatTime(logistics.end_time))
  }

  // Venue Information Section
  addSection('Venue Information')
  if (logistics.location) {
    addField('Venue Name:', logistics.location.name)
    const address = formatAddress(logistics.location)
    if (address) {
      addField('Address:', address.replace(/\n/g, ', '))
    }
  } else {
    addField('Venue:', 'Not specified')
  }

  // Load-In Details Section
  addSection('Load-In Details')
  if (logistics.load_in_notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#374151')
    doc.text('Operations Notes:', margin + 10, yPos)
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#000000')
    const notesLines = doc.splitTextToSize(logistics.load_in_notes, contentWidth - 20)
    doc.text(notesLines, margin + 20, yPos)
    yPos += notesLines.length * 9 + 8
  }
  if (logistics.location?.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#374151')
    doc.text('Venue Instructions:', margin + 10, yPos)
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#000000')
    const venueNotesLines = doc.splitTextToSize(logistics.location.notes, contentWidth - 20)
    doc.text(venueNotesLines, margin + 20, yPos)
    yPos += venueNotesLines.length * 9 + 8
  }

  // On-Site Contacts Section (2 column layout)
  checkPageBreak(150)
  addSection('On-Site Contacts')

  const columnWidth = contentWidth / 2
  const leftX = margin + 10
  const rightX = margin + columnWidth + 10
  const contactsStartY = yPos

  // Left column - Venue Contact
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('VENUE CONTACT', leftX, yPos)
  yPos += 10
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${logistics.venue_contact_name || logistics.location?.contact_name || 'Not specified'}`, leftX, yPos)
  yPos += 9
  if (logistics.venue_contact_phone || logistics.location?.contact_phone) {
    doc.text(`Phone: ${logistics.venue_contact_phone || logistics.location?.contact_phone}`, leftX, yPos)
    yPos += 9
  }
  if (logistics.venue_contact_email || logistics.location?.contact_email) {
    doc.text(`Email: ${logistics.venue_contact_email || logistics.location?.contact_email}`, leftX, yPos)
    yPos += 9
  }

  const leftColumnHeight = yPos - contactsStartY

  // Right column - Event Planner
  yPos = contactsStartY
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('EVENT PLANNER', rightX, yPos)
  yPos += 10
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${logistics.event_planner_name || 'Not specified'}`, rightX, yPos)
  yPos += 9
  if (logistics.event_planner_phone) {
    doc.text(`Phone: ${logistics.event_planner_phone}`, rightX, yPos)
    yPos += 9
  }
  if (logistics.event_planner_email) {
    doc.text(`Email: ${logistics.event_planner_email}`, rightX, yPos)
    yPos += 9
  }

  // Move yPos to the bottom of whichever column is taller
  yPos = Math.max(yPos, contactsStartY + leftColumnHeight) + 8

  // Client Package & Items Section (2 column layout)
  checkPageBreak(150)
  addSection('Client Package & Items')

  const packagesStartY = yPos

  // Left column - Packages
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('BOOTH TYPE & PACKAGES', leftX, yPos)
  yPos += 10
  if (logistics.packages && logistics.packages.length > 0) {
    logistics.packages.forEach(pkg => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const pkgText = doc.splitTextToSize(`• ${pkg.name} (${pkg.type})`, columnWidth - 20)
      doc.text(pkgText, leftX, yPos)
      yPos += pkgText.length * 9
    })
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    doc.text('No packages', leftX, yPos)
    doc.setTextColor('#000000')
    yPos += 9
  }

  const packagesHeight = yPos - packagesStartY

  // Right column - Custom Items
  yPos = packagesStartY
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ADD-ONS & CUSTOM ITEMS', rightX, yPos)
  yPos += 10
  if (logistics.custom_items && logistics.custom_items.length > 0) {
    logistics.custom_items.forEach(item => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const itemText = doc.splitTextToSize(`• ${item.item_name} (${item.item_type})`, columnWidth - 20)
      doc.text(itemText, rightX, yPos)
      yPos += itemText.length * 9
    })
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    doc.text('No add-ons', rightX, yPos)
    doc.setTextColor('#000000')
    yPos += 9
  }

  yPos = Math.max(yPos, packagesStartY + packagesHeight) + 8

  // Event Staff Section (2 column layout)
  checkPageBreak(150)
  addSection('Event Staff')

  const operationsStaff = logistics.staff?.filter(s => s.role_type === 'operations') || []
  const eventStaff = logistics.staff?.filter(s => s.role_type === 'event_staff') || []

  const staffStartY = yPos
  const brandColorHex = `rgb(${PDF_BRAND_COLOR.join(',')})`

  // Left column - Operations Team
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('OPERATIONS TEAM', leftX, yPos)
  yPos += 10
  if (operationsStaff.length > 0) {
    operationsStaff.forEach(staff => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#000000')
      doc.text(`• ${staff.name}`, leftX, yPos)
      yPos += 9
      if (staff.role) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(brandColorHex)
        doc.text(`  ${staff.role}`, leftX + 5, yPos)
        doc.setTextColor('#000000')
        yPos += 9
      }
      if (staff.email) {
        doc.setFont('helvetica', 'normal')
        const emailText = doc.splitTextToSize(staff.email, columnWidth - 20)
        doc.text(emailText, leftX + 5, yPos)
        yPos += emailText.length * 9
      }
      yPos += 3
    })
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    doc.text('None assigned', leftX, yPos)
    doc.setTextColor('#000000')
    yPos += 9
  }

  const staffLeftHeight = yPos - staffStartY

  // Right column - Event Day Staff
  yPos = staffStartY
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('EVENT DAY STAFF', rightX, yPos)
  yPos += 10
  if (eventStaff.length > 0) {
    eventStaff.forEach(staff => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#000000')
      doc.text(`• ${staff.name}`, rightX, yPos)
      yPos += 9
      if (staff.role) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(brandColorHex)
        doc.text(`  ${staff.role}`, rightX + 5, yPos)
        doc.setTextColor('#000000')
        yPos += 9
      }
      if (staff.email) {
        doc.setFont('helvetica', 'normal')
        const emailText = doc.splitTextToSize(staff.email, columnWidth - 20)
        doc.text(emailText, rightX + 5, yPos)
        yPos += emailText.length * 9
      }
      yPos += 3
    })
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    doc.text('None assigned', rightX, yPos)
    doc.setTextColor('#000000')
    yPos += 9
  }

  yPos = Math.max(yPos, staffStartY + staffLeftHeight) + 8

  // Additional Notes Section
  if (logistics.event_notes) {
    checkPageBreak(100)
    addSection('Additional Notes')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#000000')
    const notesLines = doc.splitTextToSize(logistics.event_notes, contentWidth - 20)
    doc.text(notesLines, margin + 10, yPos)
  }

  return doc
}

/**
 * Generate a filename for the logistics PDF
 *
 * @param clientName - The client name for the filename
 * @returns Formatted filename string
 */
export function getLogisticsPdfFilename(clientName?: string): string {
  const safeName = clientName?.replace(/\s+/g, '_') || 'Document'
  const dateStr = new Date().toISOString().split('T')[0]
  return `Event_Logistics_${safeName}_${dateStr}.pdf`
}
