import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface InvoicePDFData {
  invoice: {
    id: string
    invoice_number: string
    account_name: string | null
    contact_name: string | null
    opportunity_name: string | null
    issue_date: string
    due_date: string
    status: string
    subtotal: number
    tax_rate: number | null
    tax_amount: number | null
    total_amount: number
    paid_amount: number | null
    balance_amount: number
    payment_terms: string | null
    notes: string | null
    terms: string | null
    line_items: Array<{
      name: string
      description: string | null
      quantity: number
      unit_price: number
      total_price: number
      taxable?: boolean
    }>
  }
  companyInfo: {
    name: string
    address: string
    phone: string
    email: string
    logoUrl?: string
  }
}

export const generateInvoicePDF = async (data: InvoicePDFData): Promise<Buffer> => {
  const { invoice, companyInfo } = data

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper function to load image as base64
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      const contentType = response.headers.get('content-type') || 'image/png'

      return `data:${contentType};base64,${base64}`
    } catch (error) {
      console.error('Error loading logo image:', error)
      return null
    }
  }

  // Create a new PDF document
  const doc = new jsPDF()

  // Set font
  doc.setFont('helvetica')

  // Page dimensions and column setup
  const pageWidth = 210 // A4 width in mm
  const margin = 20
  const contentWidth = pageWidth - (margin * 2) // 170mm

  // Column positions (matching 46%, 18%, 18%, 18%)
  const col1X = margin // Item - starts at left margin
  const col1Width = contentWidth * 0.46 // 78.2mm
  const col2X = margin + (contentWidth * 0.46) + 5 // Qty
  const col3X = margin + (contentWidth * 0.64) + 5 // Unit Price
  const col4X = margin + (contentWidth * 0.82) + 5 // Amount
  const rightEdge = pageWidth - margin

  let yPos = 25

  // === HEADER SECTION ===
  // Company Logo (left side)
  if (companyInfo.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(companyInfo.logoUrl)
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, yPos, 0, 16, undefined, 'FAST')
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error)
    }
  }

  // Invoice Title and Number (right side)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', rightEdge, yPos + 8, { align: 'right' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`#${invoice.invoice_number}`, rightEdge, yPos + 15, { align: 'right' })

  yPos += 35

  // === BILLING INFORMATION (Two Column Layout) ===
  const billingYStart = yPos

  // Left Column - Bill To
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('BILL TO', margin, yPos)

  yPos += 6
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)

  if (invoice.account_name) {
    doc.text(invoice.account_name, margin, yPos)
    yPos += 5
  }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  if (invoice.contact_name && invoice.account_name) {
    doc.text(`Attn: ${invoice.contact_name}`, margin, yPos)
    yPos += 5
  } else if (invoice.contact_name) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(invoice.contact_name, margin, yPos)
    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
  }

  if (invoice.opportunity_name) {
    doc.text(`RE: ${invoice.opportunity_name}`, margin, yPos)
    yPos += 5
  }

  // Right Column - Dates
  let rightColY = billingYStart
  const rightColX = margin + (contentWidth * 0.55)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('ISSUE DATE', rightColX, rightColY)
  rightColY += 5

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(formatDate(invoice.issue_date), rightColX, rightColY)
  rightColY += 8

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DUE DATE', rightColX, rightColY)
  rightColY += 5

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(formatDate(invoice.due_date), rightColX, rightColY)

  // Add spacing after billing section
  yPos = Math.max(yPos, rightColY) + 10

  // Border line under billing section
  doc.setDrawColor(229, 229, 229)
  doc.setLineWidth(0.3)
  doc.line(margin, yPos, rightEdge, yPos)

  yPos += 12

  // === LINE ITEMS TABLE ===
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('ITEM', col1X, yPos)
  doc.text('QTY', col2X + 15, yPos, { align: 'right' })
  doc.text('UNIT PRICE', col3X + 15, yPos, { align: 'right' })
  doc.text('AMOUNT', rightEdge, yPos, { align: 'right' })

  // Header border (heavier line)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.8)
  doc.line(margin, yPos + 2, rightEdge, yPos + 2)

  yPos += 10

  // === LINE ITEMS ===
  doc.setTextColor(0, 0, 0)

  invoice.line_items.forEach((item, index) => {
    if (yPos > 250) {
      doc.addPage()
      yPos = 30
    }

    const itemStartY = yPos

    // Item name (bold)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const itemName = doc.splitTextToSize(item.name, col1Width - 2)
    doc.text(itemName, col1X, yPos)
    yPos += itemName.length * 4

    // Description (smaller, if exists)
    if (item.description) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      const descLines = doc.splitTextToSize(item.description, col1Width - 2)
      doc.text(descLines, col1X, yPos + 1)
      yPos += descLines.length * 3.5
      doc.setTextColor(0, 0, 0)
    }

    // Taxable indicator
    if (item.taxable === false) {
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text('Non-taxable', col1X, yPos + 2)
      yPos += 4
      doc.setTextColor(0, 0, 0)
    }

    // Quantity, Unit Price, and Amount (aligned to first line)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(item.quantity.toString(), col2X + 15, itemStartY, { align: 'right' })
    doc.text(formatCurrency(item.unit_price), col3X + 15, itemStartY, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(item.total_price), rightEdge, itemStartY, { align: 'right' })

    // Add spacing between items
    yPos += 8

    // Draw subtle separator line between items
    if (index < invoice.line_items.length - 1) {
      doc.setDrawColor(240, 240, 240)
      doc.setLineWidth(0.1)
      doc.line(margin, yPos - 3, rightEdge, yPos - 3)
    }
  })

  // === TOTALS SECTION ===
  yPos += 8
  const totalsX = rightEdge - 70 // Right-aligned totals container

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(70, 70, 70)
  doc.text('Subtotal:', totalsX, yPos)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(formatCurrency(invoice.subtotal), rightEdge, yPos, { align: 'right' })
  yPos += 7

  if (invoice.tax_amount && invoice.tax_amount > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 70, 70)
    doc.text(`Tax (${((invoice.tax_rate || 0) * 100).toFixed(2)}%):`, totalsX, yPos)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(formatCurrency(invoice.tax_amount), rightEdge, yPos, { align: 'right' })
    yPos += 7
  }

  // Draw line before total
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.8)
  doc.line(totalsX, yPos, rightEdge, yPos)
  yPos += 8

  // Total
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Total:', totalsX, yPos)
  doc.setFontSize(14)
  doc.text(formatCurrency(invoice.total_amount), rightEdge, yPos, { align: 'right' })

  // Paid amount and balance due
  if (invoice.paid_amount && invoice.paid_amount > 0) {
    yPos += 7

    // Border above paid amount
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(totalsX, yPos, rightEdge, yPos)
    yPos += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 70, 70)
    doc.text('Amount Paid:', totalsX, yPos)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(34, 139, 34) // Green color
    doc.text(`-${formatCurrency(invoice.paid_amount)}`, rightEdge, yPos, { align: 'right' })
    yPos += 7

    // Heavy border before balance due
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.8)
    doc.line(totalsX, yPos, rightEdge, yPos)
    yPos += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Balance Due:', totalsX, yPos)

    doc.setFontSize(14)
    doc.setTextColor(52, 125, 196) // Blue color
    doc.text(formatCurrency(invoice.balance_amount), rightEdge, yPos, { align: 'right' })
  }

  doc.setTextColor(0, 0, 0) // Reset color

  // === NOTES AND TERMS SECTION ===
  if (invoice.notes || invoice.terms) {
    yPos += 15

    // Draw separator line
    doc.setDrawColor(229, 229, 229)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, rightEdge, yPos)
    yPos += 10

    const hasNotes = !!invoice.notes
    const hasTerms = !!invoice.terms
    const columnWidth = contentWidth / 2 - 5

    if (hasNotes && hasTerms) {
      // Two columns
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('NOTES', margin, yPos)
      doc.text('TERMS & CONDITIONS', margin + columnWidth + 10, yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(70, 70, 70)

      const notesLines = doc.splitTextToSize(invoice.notes, columnWidth)
      const termsLines = doc.splitTextToSize(invoice.terms, columnWidth)

      doc.text(notesLines, margin, yPos)
      doc.text(termsLines, margin + columnWidth + 10, yPos)
    } else if (hasNotes) {
      // Notes only (full width)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('NOTES', margin, yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(70, 70, 70)
      const notesLines = doc.splitTextToSize(invoice.notes, contentWidth)
      doc.text(notesLines, margin, yPos)
    } else if (hasTerms) {
      // Terms only (full width)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('TERMS & CONDITIONS', margin, yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(70, 70, 70)
      const termsLines = doc.splitTextToSize(invoice.terms, contentWidth)
      doc.text(termsLines, margin, yPos)
    }
  }
  
  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  return pdfBuffer
}

export const generateInvoicePDFFromHTML = async (htmlElement: HTMLElement): Promise<Buffer> => {
  const canvas = await html2canvas(htmlElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
  })
  
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  const imgWidth = 210
  const pageHeight = 295
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  
  let position = 0
  
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight
  
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }
  
  return Buffer.from(pdf.output('arraybuffer'))
}






