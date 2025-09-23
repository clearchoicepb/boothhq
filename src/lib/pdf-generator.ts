import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface InvoicePDFData {
  invoice: {
    id: string
    invoice_number: string
    account_name: string | null
    contact_name: string | null
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
    line_items: Array<{
      description: string
      quantity: number
      unit_price: number
      total_price: number
    }>
  }
  companyInfo: {
    name: string
    address: string
    phone: string
    email: string
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

  // Create a new PDF document
  const doc = new jsPDF()
  
  // Set font
  doc.setFont('helvetica')
  
  // Company Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(companyInfo.name, 20, 30)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(companyInfo.address, 20, 40)
  doc.text(`Phone: ${companyInfo.phone}`, 20, 45)
  doc.text(`Email: ${companyInfo.email}`, 20, 50)
  
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
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', 20, 70)
  
  doc.setFont('helvetica', 'normal')
  let yPos = 80
  if (invoice.account_name) {
    doc.text(invoice.account_name, 20, yPos)
    yPos += 5
  }
  if (invoice.contact_name) {
    doc.text(invoice.contact_name, 20, yPos)
    yPos += 5
  }
  
  // Line Items Table Header
  yPos = 110
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', 20, yPos)
  doc.text('Qty', 120, yPos)
  doc.text('Unit Price', 140, yPos)
  doc.text('Total', 170, yPos)
  
  // Draw line under header
  doc.line(20, yPos + 2, 190, yPos + 2)
  
  // Line Items
  yPos += 10
  doc.setFont('helvetica', 'normal')
  
  invoice.line_items.forEach((item) => {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    doc.text(item.description, 20, yPos)
    doc.text(item.quantity.toString(), 120, yPos)
    doc.text(formatCurrency(item.unit_price), 140, yPos)
    doc.text(formatCurrency(item.total_price), 170, yPos)
    yPos += 8
  })
  
  // Totals Section
  yPos += 10
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', 140, yPos)
  doc.text(formatCurrency(invoice.subtotal), 170, yPos)
  yPos += 8
  
  if (invoice.tax_amount && invoice.tax_amount > 0) {
    doc.text(`Tax (${((invoice.tax_rate || 0) * 100).toFixed(1)}%):`, 140, yPos)
    doc.text(formatCurrency(invoice.tax_amount), 170, yPos)
    yPos += 8
  }
  
  doc.setFont('helvetica', 'bold')
  doc.text('Total Amount:', 140, yPos)
  doc.text(formatCurrency(invoice.total_amount), 170, yPos)
  yPos += 8
  
  if (invoice.paid_amount && invoice.paid_amount > 0) {
    doc.setFont('helvetica', 'normal')
    doc.text('Amount Paid:', 140, yPos)
    doc.text(formatCurrency(invoice.paid_amount), 170, yPos)
    yPos += 8
    
    doc.setFont('helvetica', 'bold')
    doc.text('Balance Due:', 140, yPos)
    doc.text(formatCurrency(invoice.balance_amount), 170, yPos)
  }
  
  // Payment Terms
  if (invoice.payment_terms) {
    yPos += 20
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Payment Terms:', 20, yPos)
    doc.text(invoice.payment_terms, 20, yPos + 8)
  }
  
  // Notes
  if (invoice.notes) {
    yPos += 20
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Notes:', 20, yPos)
    const notesLines = doc.splitTextToSize(invoice.notes, 170)
    doc.text(notesLines, 20, yPos + 8)
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






