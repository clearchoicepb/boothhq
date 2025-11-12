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

  // Company Header - with logo if available
  let headerYPos = 30

  if (companyInfo.logoUrl) {
    try {
      const logoBase64 = await loadImageAsBase64(companyInfo.logoUrl)
      if (logoBase64) {
        // Add logo image - max height of 20mm, auto width
        doc.addImage(logoBase64, 'PNG', 20, 15, 0, 20, undefined, 'FAST')
        headerYPos = 40 // Adjust text position if logo is present
      }
    } catch (error) {
      console.error('Error adding logo to PDF:', error)
      // Fall back to text-only header
    }
  }

  // Company name (smaller if logo is present)
  if (companyInfo.logoUrl) {
    doc.setFontSize(16)
  } else {
    doc.setFontSize(24)
  }
  doc.setFont('helvetica', 'bold')
  doc.text(companyInfo.name, 20, headerYPos)

  // Company contact info - positioned below logo/name
  const contactYStart = headerYPos + 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(companyInfo.address, 20, contactYStart)
  doc.text(`Phone: ${companyInfo.phone}`, 20, contactYStart + 5)
  doc.text(`Email: ${companyInfo.email}`, 20, contactYStart + 10)
  
  // Invoice Title and Number
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', 150, 30)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 40)
  doc.text(`Date: ${formatDate(invoice.issue_date)}`, 150, 45)
  doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 150, 50)
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 150, 55)
  
  // Bill To Section
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO:', 20, 70)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  let yPos = 78
  if (invoice.account_name) {
    doc.text(invoice.account_name, 20, yPos)
    yPos += 6
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (invoice.contact_name && invoice.account_name) {
    doc.text(`Attn: ${invoice.contact_name}`, 20, yPos)
    yPos += 5
  } else if (invoice.contact_name) {
    doc.text(invoice.contact_name, 20, yPos)
    yPos += 5
  }

  if (invoice.opportunity_name) {
    doc.text(`RE: ${invoice.opportunity_name}`, 20, yPos)
    yPos += 5
  }
  
  // Line Items Table Header
  yPos = 110
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ITEM', 20, yPos)
  doc.text('QTY', 110, yPos, { align: 'right' })
  doc.text('UNIT PRICE', 140, yPos, { align: 'right' })
  doc.text('AMOUNT', 180, yPos, { align: 'right' })

  // Draw line under header
  doc.setLineWidth(0.5)
  doc.line(20, yPos + 2, 190, yPos + 2)

  // Line Items
  yPos += 10
  doc.setFont('helvetica', 'normal')

  invoice.line_items.forEach((item) => {
    if (yPos > 240) {
      doc.addPage()
      yPos = 20
    }

    // Item name (bold)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(item.name, 20, yPos)
    yPos += 5

    // Description (smaller, if exists)
    if (item.description) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(item.description, 80)
      doc.text(descLines, 20, yPos)
      yPos += (descLines.length * 4)
    }

    // Reset position for quantity, price, and total on the same line as name
    const itemYPos = yPos - (item.description ? (doc.splitTextToSize(item.description, 80).length * 4) + 5 : 5)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(item.quantity.toString(), 110, itemYPos, { align: 'right' })
    doc.text(formatCurrency(item.unit_price), 140, itemYPos, { align: 'right' })
    doc.text(formatCurrency(item.total_price), 180, itemYPos, { align: 'right' })

    // Taxable indicator
    if (item.taxable === false) {
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text('(Non-taxable)', 20, yPos + 3)
      doc.setTextColor(0, 0, 0)
      yPos += 4
    }

    yPos += 8
  })
  
  // Totals Section
  yPos += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 140, yPos)
  doc.text(formatCurrency(invoice.subtotal), 180, yPos, { align: 'right' })
  yPos += 7

  if (invoice.tax_amount && invoice.tax_amount > 0) {
    doc.text(`Tax (${((invoice.tax_rate || 0) * 100).toFixed(2)}%):`, 140, yPos)
    doc.text(formatCurrency(invoice.tax_amount), 180, yPos, { align: 'right' })
    yPos += 7
  }

  // Draw line before total
  doc.setLineWidth(0.8)
  doc.line(140, yPos, 190, yPos)
  yPos += 8

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Due:', 140, yPos)
  doc.text(formatCurrency(invoice.total_amount), 180, yPos, { align: 'right' })
  yPos += 10
  
  if (invoice.paid_amount && invoice.paid_amount > 0) {
    doc.setFont('helvetica', 'normal')
    doc.text('Amount Paid:', 140, yPos)
    doc.text(formatCurrency(invoice.paid_amount), 170, yPos)
    yPos += 8
    
    doc.setFont('helvetica', 'bold')
    doc.text('Balance Due:', 140, yPos)
    doc.text(formatCurrency(invoice.balance_amount), 170, yPos)
  }
  
  // Notes and Terms Section
  if (invoice.notes || invoice.terms) {
    yPos += 15

    // Draw separator line
    doc.setLineWidth(0.3)
    doc.line(20, yPos, 190, yPos)
    yPos += 10

    const hasNotes = !!invoice.notes
    const hasTerms = !!invoice.terms

    if (hasNotes && hasTerms) {
      // Two columns
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTES', 20, yPos)
      doc.text('TERMS & CONDITIONS', 110, yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      const notesLines = doc.splitTextToSize(invoice.notes, 80)
      const termsLines = doc.splitTextToSize(invoice.terms, 80)

      doc.text(notesLines, 20, yPos)
      doc.text(termsLines, 110, yPos)
    } else if (hasNotes) {
      // Notes only
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('NOTES', 20, yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const notesLines = doc.splitTextToSize(invoice.notes, 170)
      doc.text(notesLines, 20, yPos)
    } else if (hasTerms) {
      // Terms only
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('TERMS & CONDITIONS', 20, yPos)

      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const termsLines = doc.splitTextToSize(invoice.terms, 170)
      doc.text(termsLines, 20, yPos)
    }
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', 20, pageHeight - 20)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, pageHeight - 15)
  
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






