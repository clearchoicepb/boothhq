/**
 * CSV and PDF Export Utilities
 * Converts data to CSV/PDF format and triggers download
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface CSVColumn {
  key: string
  label: string
  format?: (value: any) => string
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: any[], columns: CSVColumn[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // Create header row
  const headers = columns.map(col => `"${col.label}"`).join(',')

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key]

      // Apply custom formatter if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value)
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""'
      }

      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""')

      // Wrap in quotes
      return `"${stringValue}"`
    }).join(',')
  })

  return [headers, ...rows].join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Create blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value || 0)
}

/**
 * Format date values
 */
export function formatDate(value: string | Date): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('en-US')
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number): string {
  return `${(value || 0).toFixed(1)}%`
}

/**
 * Export dashboard summary to CSV
 */
export function exportDashboardSummary(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `dashboard-summary-${dateRange}-${timestamp}.csv`

  const summaryData = [
    {
      metric: 'Revenue Generated',
      value: formatCurrency(data.dashboard?.totalRevenueGenerated || 0),
      change: `${(data.dashboard?.revenueGeneratedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.revenueGeneratedChange || 0}%`
    },
    {
      metric: 'Payments Received',
      value: formatCurrency(data.dashboard?.totalPaymentsReceived || 0),
      change: `${(data.dashboard?.paymentsReceivedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.paymentsReceivedChange || 0}%`
    },
    {
      metric: 'Events Booked',
      value: data.dashboard?.totalEventsBooked || 0,
      change: `${(data.dashboard?.eventsBookedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.eventsBookedChange || 0}%`
    },
    {
      metric: 'Scheduled Events',
      value: data.dashboard?.totalScheduledEvents || 0,
      change: `${(data.dashboard?.scheduledEventsChange || 0) >= 0 ? '+' : ''}${data.dashboard?.scheduledEventsChange || 0}%`
    }
  ]

  const columns: CSVColumn[] = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
    { key: 'change', label: 'Change vs Previous Period' }
  ]

  const csv = convertToCSV(summaryData, columns)
  downloadCSV(csv, filename)
}

/**
 * Export revenue trend to CSV
 */
export function exportRevenueTrend(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `revenue-trend-${dateRange}-${timestamp}.csv`

  const columns: CSVColumn[] = [
    { key: 'month', label: 'Month' },
    { key: 'revenue', label: 'Revenue Generated', format: formatCurrency },
    { key: 'payments', label: 'Payments Received', format: formatCurrency }
  ]

  const csv = convertToCSV(data.revenueByMonth || [], columns)
  downloadCSV(csv, filename)
}

/**
 * Export events trend to CSV
 */
export function exportEventsTrend(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `events-trend-${dateRange}-${timestamp}.csv`

  const columns: CSVColumn[] = [
    { key: 'month', label: 'Month' },
    { key: 'booked', label: 'Events Booked' },
    { key: 'scheduled', label: 'Scheduled Event Days' }
  ]

  const csv = convertToCSV(data.eventsByMonth || [], columns)
  downloadCSV(csv, filename)
}

/**
 * Export invoices by status to CSV
 */
export function exportInvoicesByStatus(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `invoices-by-status-${dateRange}-${timestamp}.csv`

  const columns: CSVColumn[] = [
    { key: 'status', label: 'Status' },
    { key: 'count', label: 'Count' },
    { key: 'amount', label: 'Total Amount', format: formatCurrency }
  ]

  const csv = convertToCSV(data.invoicesByStatus || [], columns)
  downloadCSV(csv, filename)
}

/**
 * Export complete dashboard report (all sections combined)
 */
export function exportCompleteDashboard(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `complete-dashboard-report-${dateRange}-${timestamp}.csv`

  let csvContent = ''

  // KPI Summary Section
  csvContent += 'KEY PERFORMANCE INDICATORS\n'
  csvContent += 'Metric,Value,Change vs Previous Period\n'
  csvContent += `Revenue Generated,"${formatCurrency(data.dashboard?.totalRevenueGenerated || 0)}",${(data.dashboard?.revenueGeneratedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.revenueGeneratedChange || 0}%\n`
  csvContent += `Payments Received,"${formatCurrency(data.dashboard?.totalPaymentsReceived || 0)}",${(data.dashboard?.paymentsReceivedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.paymentsReceivedChange || 0}%\n`
  csvContent += `Events Booked,${data.dashboard?.totalEventsBooked || 0},${(data.dashboard?.eventsBookedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.eventsBookedChange || 0}%\n`
  csvContent += `Scheduled Events,${data.dashboard?.totalScheduledEvents || 0},${(data.dashboard?.scheduledEventsChange || 0) >= 0 ? '+' : ''}${data.dashboard?.scheduledEventsChange || 0}%\n`
  csvContent += '\n'

  // Revenue Trend Section
  csvContent += 'REVENUE TREND\n'
  csvContent += 'Month,Revenue Generated,Payments Received\n'
  if (data.revenueByMonth) {
    data.revenueByMonth.forEach((row: any) => {
      csvContent += `${row.month},"${formatCurrency(row.revenue || 0)}","${formatCurrency(row.payments || 0)}"\n`
    })
  }
  csvContent += '\n'

  // Events Trend Section
  csvContent += 'EVENTS TREND\n'
  csvContent += 'Month,Events Booked,Scheduled Event Days\n'
  if (data.eventsByMonth) {
    data.eventsByMonth.forEach((row: any) => {
      csvContent += `${row.month},${row.booked || 0},${row.scheduled || 0}\n`
    })
  }
  csvContent += '\n'

  // Invoices by Status Section
  csvContent += 'INVOICES BY STATUS\n'
  csvContent += 'Status,Count,Total Amount\n'
  if (data.invoicesByStatus) {
    data.invoicesByStatus.forEach((row: any) => {
      csvContent += `${row.status},${row.count || 0},"${formatCurrency(row.amount || 0)}"\n`
    })
  }

  downloadCSV(csvContent, filename)
}

// ==================== PDF EXPORT FUNCTIONS ====================

/**
 * Download PDF file
 */
function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename)
}

/**
 * Add PDF header
 */
function addPDFHeader(doc: jsPDF, title: string, dateRange: string): void {
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date Range: ${dateRange}`, 14, 28)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34)

  // Line under header
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)
}

/**
 * Export dashboard summary to PDF
 */
export function exportDashboardSummaryPDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `dashboard-summary-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Dashboard Summary', getDateRangeLabel(dateRange))

  const tableData = [
    [
      'Revenue Generated',
      formatCurrency(data.dashboard?.totalRevenueGenerated || 0),
      `${(data.dashboard?.revenueGeneratedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.revenueGeneratedChange || 0}%`
    ],
    [
      'Payments Received',
      formatCurrency(data.dashboard?.totalPaymentsReceived || 0),
      `${(data.dashboard?.paymentsReceivedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.paymentsReceivedChange || 0}%`
    ],
    [
      'Events Booked',
      (data.dashboard?.totalEventsBooked || 0).toString(),
      `${(data.dashboard?.eventsBookedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.eventsBookedChange || 0}%`
    ],
    [
      'Scheduled Events',
      (data.dashboard?.totalScheduledEvents || 0).toString(),
      `${(data.dashboard?.scheduledEventsChange || 0) >= 0 ? '+' : ''}${data.dashboard?.scheduledEventsChange || 0}%`
    ]
  ]

  autoTable(doc, {
    head: [['Metric', 'Value', 'Change vs Previous Period']],
    body: tableData,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 10 }
  })

  downloadPDF(doc, filename)
}

/**
 * Export revenue trend to PDF
 */
export function exportRevenueTrendPDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `revenue-trend-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Revenue Trend', getDateRangeLabel(dateRange))

  const tableData = (data.revenueByMonth || []).map((row: any) => [
    row.month,
    formatCurrency(row.revenue || 0),
    formatCurrency(row.payments || 0)
  ])

  autoTable(doc, {
    head: [['Month', 'Revenue Generated', 'Payments Received']],
    body: tableData,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 10 }
  })

  downloadPDF(doc, filename)
}

/**
 * Export events trend to PDF
 */
export function exportEventsTrendPDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `events-trend-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Events Trend', getDateRangeLabel(dateRange))

  const tableData = (data.eventsByMonth || []).map((row: any) => [
    row.month,
    (row.booked || 0).toString(),
    (row.scheduled || 0).toString()
  ])

  autoTable(doc, {
    head: [['Month', 'Events Booked', 'Scheduled Event Days']],
    body: tableData,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 10 }
  })

  downloadPDF(doc, filename)
}

/**
 * Export invoices by status to PDF
 */
export function exportInvoicesByStatusPDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `invoices-by-status-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Invoices by Status', getDateRangeLabel(dateRange))

  const tableData = (data.invoicesByStatus || []).map((row: any) => [
    row.status,
    (row.count || 0).toString(),
    formatCurrency(row.amount || 0)
  ])

  const totalCount = (data.invoicesByStatus || []).reduce((sum: number, row: any) => sum + (row.count || 0), 0)
  const totalAmount = (data.invoicesByStatus || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0)
  tableData.push(['TOTAL', totalCount.toString(), formatCurrency(totalAmount)])

  autoTable(doc, {
    head: [['Status', 'Count', 'Total Amount']],
    body: tableData,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 10 },
    footStyles: { fillColor: [52, 125, 196], fontStyle: 'bold' }
  })

  downloadPDF(doc, filename)
}

/**
 * Export complete dashboard report to PDF
 */
export function exportCompleteDashboardPDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `complete-dashboard-report-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Complete Dashboard Report', getDateRangeLabel(dateRange))

  // KPI Summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Key Performance Indicators', 14, 48)

  const kpiData = [
    [
      'Revenue Generated',
      formatCurrency(data.dashboard?.totalRevenueGenerated || 0),
      `${(data.dashboard?.revenueGeneratedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.revenueGeneratedChange || 0}%`
    ],
    [
      'Payments Received',
      formatCurrency(data.dashboard?.totalPaymentsReceived || 0),
      `${(data.dashboard?.paymentsReceivedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.paymentsReceivedChange || 0}%`
    ],
    [
      'Events Booked',
      (data.dashboard?.totalEventsBooked || 0).toString(),
      `${(data.dashboard?.eventsBookedChange || 0) >= 0 ? '+' : ''}${data.dashboard?.eventsBookedChange || 0}%`
    ],
    [
      'Scheduled Events',
      (data.dashboard?.totalScheduledEvents || 0).toString(),
      `${(data.dashboard?.scheduledEventsChange || 0) >= 0 ? '+' : ''}${data.dashboard?.scheduledEventsChange || 0}%`
    ]
  ]

  autoTable(doc, {
    head: [['Metric', 'Value', 'Change']],
    body: kpiData,
    startY: 53,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 9 }
  })

  // Revenue Trend
  let finalY = (doc as any).lastAutoTable.finalY || 53
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Revenue Trend', 14, finalY + 15)

  const revenueData = (data.revenueByMonth || []).map((row: any) => [
    row.month,
    formatCurrency(row.revenue || 0),
    formatCurrency(row.payments || 0)
  ])

  autoTable(doc, {
    head: [['Month', 'Revenue Generated', 'Payments Received']],
    body: revenueData,
    startY: finalY + 20,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 9 }
  })

  // Check if we need a new page
  finalY = (doc as any).lastAutoTable.finalY || finalY + 20
  if (finalY > 220) {
    doc.addPage()
    finalY = 20
  }

  // Events Trend
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Events Trend', 14, finalY + 15)

  const eventsData = (data.eventsByMonth || []).map((row: any) => [
    row.month,
    (row.booked || 0).toString(),
    (row.scheduled || 0).toString()
  ])

  autoTable(doc, {
    head: [['Month', 'Events Booked', 'Scheduled Days']],
    body: eventsData,
    startY: finalY + 20,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 9 }
  })

  // Invoices by Status
  finalY = (doc as any).lastAutoTable.finalY || finalY + 20
  if (finalY > 220) {
    doc.addPage()
    finalY = 20
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoices by Status', 14, finalY + 15)

  const invoiceData = (data.invoicesByStatus || []).map((row: any) => [
    row.status,
    (row.count || 0).toString(),
    formatCurrency(row.amount || 0)
  ])

  autoTable(doc, {
    head: [['Status', 'Count', 'Total Amount']],
    body: invoiceData,
    startY: finalY + 20,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 9 }
  })

  downloadPDF(doc, filename)
}

/**
 * Helper function to get date range label
 */
function getDateRangeLabel(range: string): string {
  const labels: Record<string, string> = {
    'this_week': 'This Week',
    'this_month': 'This Month',
    'this_quarter': 'This Quarter',
    'this_year': 'This Year',
    'yesterday': 'Yesterday',
    'last_week': 'Last Week',
    'last_quarter': 'Last Quarter',
    'last_year': 'Last Year',
    'custom': 'Custom Range',
    // Legacy support
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year'
  }
  return labels[range] || range
}
