/**
 * Logistics PDF Generator
 *
 * Generates PDF documents for event logistics sheets.
 * Updated to work with new 8-section logistics data structure.
 */

import jsPDF from 'jspdf'
import type { LogisticsData, LogisticsLocation } from '@/types/logistics'
import { PDF_BRAND_COLOR, formatTime as sharedFormatTime } from '../utils'

/**
 * Format a location into a multi-line address string
 */
function formatAddress(location: LogisticsLocation | null | undefined): string | null {
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
function formatTime(time: string | null | undefined): string {
  if (!time) return ''
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
  doc.text(logistics.event_title || 'Event Logistics', margin, yPos)
  yPos += 18

  // Event type badge
  if (logistics.event_type) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(`rgb(${PDF_BRAND_COLOR.join(',')})`)
    const formattedType = logistics.event_type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
    doc.text(formattedType, margin, yPos)
    yPos += 12
  }

  // Client name
  if (logistics.client_name) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(`rgb(${PDF_BRAND_COLOR.join(',')})`)
    doc.text(`Client: ${logistics.client_name}`, margin, yPos)
    yPos += 12
  }

  // Client contact
  if (logistics.client_contact?.name) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    let contactText = `Contact: ${logistics.client_contact.name}`
    if (logistics.client_contact.phone) {
      contactText += ` | ${logistics.client_contact.phone}`
    }
    doc.text(contactText, margin, yPos)
    yPos += 15
  } else {
    yPos += 5
  }

  // Event Schedule Section
  addSection('Event Schedule')
  if (logistics.event_date) {
    const eventDate = new Date(logistics.event_date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    addField('Date:', eventDate)
  }
  if (logistics.setup_time) {
    addField('Setup Time:', formatTime(logistics.setup_time))
  }
  if (logistics.start_time) {
    addField('Start Time:', formatTime(logistics.start_time))
  }
  if (logistics.end_time) {
    addField('End Time:', formatTime(logistics.end_time))
  }

  // Event Location Section
  addSection('Event Location')
  if (logistics.location) {
    if (logistics.location.name) {
      addField('Venue Name:', logistics.location.name)
    }
    const address = formatAddress(logistics.location)
    if (address) {
      addField('Address:', address.replace(/\n/g, ', '))
    }
  } else {
    addField('Venue:', 'Not specified')
  }

  // Event Contacts Section (2 column layout)
  checkPageBreak(150)
  addSection('Event Contacts')

  const columnWidth = contentWidth / 2
  const leftX = margin + 10
  const rightX = margin + columnWidth + 10
  const contactsStartY = yPos

  // Left column - Onsite Contact
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ONSITE CONTACT', leftX, yPos)
  yPos += 10
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Name: ${logistics.onsite_contact?.name || 'Not specified'}`, leftX, yPos)
  yPos += 9
  if (logistics.onsite_contact?.phone) {
    doc.text(`Phone: ${logistics.onsite_contact.phone}`, leftX, yPos)
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
  doc.text(`Name: ${logistics.event_planner?.name || 'Not specified'}`, rightX, yPos)
  yPos += 9
  if (logistics.event_planner?.phone) {
    doc.text(`Phone: ${logistics.event_planner.phone}`, rightX, yPos)
    yPos += 9
  }

  // Move yPos to the bottom of whichever column is taller
  yPos = Math.max(yPos, contactsStartY + leftColumnHeight) + 8

  // Arrival Instructions Section
  checkPageBreak(100)
  addSection('Arrival Instructions')
  if (logistics.load_in_notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#374151')
    doc.text('Load-In Notes:', margin + 10, yPos)
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#000000')
    const notesLines = doc.splitTextToSize(logistics.load_in_notes, contentWidth - 20)
    doc.text(notesLines, margin + 20, yPos)
    yPos += notesLines.length * 9 + 8
  }
  if (logistics.parking_instructions) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#374151')
    doc.text('Parking & Venue Instructions:', margin + 10, yPos)
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#000000')
    const parkingLines = doc.splitTextToSize(logistics.parking_instructions, contentWidth - 20)
    doc.text(parkingLines, margin + 20, yPos)
    yPos += parkingLines.length * 9 + 8
  }

  // Event Scope Section (packages, add-ons, equipment)
  checkPageBreak(150)
  addSection('Event Scope')

  const scopeStartY = yPos

  // Left column - Packages
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PACKAGES', leftX, yPos)
  yPos += 10
  if (logistics.packages && logistics.packages.length > 0) {
    logistics.packages.forEach(pkg => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const pkgText = doc.splitTextToSize(`• ${pkg.name}`, columnWidth - 20)
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

  const packagesHeight = yPos - scopeStartY

  // Right column - Add-Ons
  yPos = scopeStartY
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ADD-ONS', rightX, yPos)
  yPos += 10
  if (logistics.add_ons && logistics.add_ons.length > 0) {
    logistics.add_ons.forEach(addon => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const addonText = doc.splitTextToSize(`• ${addon.name}`, columnWidth - 20)
      doc.text(addonText, rightX, yPos)
      yPos += addonText.length * 9
    })
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#6b7280')
    doc.text('No add-ons', rightX, yPos)
    doc.setTextColor('#000000')
    yPos += 9
  }

  yPos = Math.max(yPos, scopeStartY + packagesHeight) + 8

  // Equipment
  if (logistics.equipment && logistics.equipment.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('EQUIPMENT', leftX, yPos)
    yPos += 10
    logistics.equipment.forEach(equip => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      let equipText = `• ${equip.name}`
      if (equip.type) equipText += ` (${equip.type})`
      if (equip.serial_number) equipText += ` - SN: ${equip.serial_number}`
      const equipLines = doc.splitTextToSize(equipText, contentWidth - 20)
      doc.text(equipLines, leftX, yPos)
      yPos += equipLines.length * 9
    })
    yPos += 8
  }

  // Event Staff Section (2 column layout)
  checkPageBreak(150)
  addSection('Event Staff')

  const staffStartY = yPos
  const brandColorHex = `rgb(${PDF_BRAND_COLOR.join(',')})`

  // Left column - Event Staff
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('EVENT STAFF', leftX, yPos)
  yPos += 10
  if (logistics.event_staff && logistics.event_staff.length > 0) {
    logistics.event_staff.forEach(staff => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#000000')
      doc.text(`• ${staff.name}`, leftX, yPos)
      yPos += 9
      if (staff.phone) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(brandColorHex)
        doc.text(`  ${staff.phone}`, leftX + 5, yPos)
        doc.setTextColor('#000000')
        yPos += 9
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

  // Right column - Event Managers
  yPos = staffStartY
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('EVENT MANAGERS', rightX, yPos)
  yPos += 10
  if (logistics.event_managers && logistics.event_managers.length > 0) {
    logistics.event_managers.forEach(manager => {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#000000')
      doc.text(`• ${manager.name}`, rightX, yPos)
      yPos += 9
      if (manager.phone) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(brandColorHex)
        doc.text(`  ${manager.phone}`, rightX + 5, yPos)
        doc.setTextColor('#000000')
        yPos += 9
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

  // Event Notes Section
  if (logistics.event_notes) {
    checkPageBreak(100)
    addSection('Event Notes')
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
export function getLogisticsPdfFilename(clientName?: string | null): string {
  const safeName = clientName?.replace(/\s+/g, '_') || 'Document'
  const dateStr = new Date().toISOString().split('T')[0]
  return `Event_Logistics_${safeName}_${dateStr}.pdf`
}
