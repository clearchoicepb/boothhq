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
  }).format(value)
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
  return `${value.toFixed(1)}%`
}

/**
 * Export dashboard summary to CSV
 */
export function exportDashboardSummary(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `dashboard-summary-${dateRange}-${timestamp}.csv`

  const summaryData = [
    { metric: 'Total Revenue', value: formatCurrency(data.dashboard.totalRevenue), change: `${data.dashboard.revenueChange}%` },
    { metric: 'Total Events', value: data.dashboard.totalEvents, change: `${data.dashboard.eventsChange}%` },
    { metric: 'Active Leads', value: data.dashboard.activeLeads, change: `${data.dashboard.leadsChange}%` },
    { metric: 'Conversion Rate', value: `${data.dashboard.conversionRate}%`, change: '-' }
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
    { key: 'revenue', label: 'Revenue', format: formatCurrency }
  ]

  const csv = convertToCSV(data.revenueByMonth, columns)
  downloadCSV(csv, filename)
}

/**
 * Export lead sources to CSV
 */
export function exportLeadSources(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `lead-sources-${dateRange}-${timestamp}.csv`

  const columns: CSVColumn[] = [
    { key: 'source', label: 'Source' },
    { key: 'count', label: 'Count' }
  ]

  const csv = convertToCSV(data.leadsBySource, columns)
  downloadCSV(csv, filename)
}

/**
 * Export opportunity pipeline to CSV
 */
export function exportOpportunityPipeline(data: any, dateRange: string): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `opportunity-pipeline-${dateRange}-${timestamp}.csv`

  const columns: CSVColumn[] = [
    { key: 'stage', label: 'Stage' },
    { key: 'value', label: 'Total Value', format: formatCurrency },
    { key: 'count', label: 'Opportunity Count' }
  ]

  const csv = convertToCSV(data.opportunityPipeline, columns)
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
  csvContent += `Total Revenue,"${formatCurrency(data.dashboard.totalRevenue)}",${data.dashboard.revenueChange}%\n`
  csvContent += `Total Events,${data.dashboard.totalEvents},${data.dashboard.eventsChange}%\n`
  csvContent += `Active Leads,${data.dashboard.activeLeads},${data.dashboard.leadsChange}%\n`
  csvContent += `Conversion Rate,${data.dashboard.conversionRate}%,-\n`
  csvContent += '\n'

  // Revenue Trend Section
  csvContent += 'REVENUE TREND\n'
  csvContent += 'Month,Revenue\n'
  data.revenueByMonth.forEach((row: any) => {
    csvContent += `${row.month},"${formatCurrency(row.revenue)}"\n`
  })
  csvContent += '\n'

  // Lead Sources Section
  csvContent += 'LEAD SOURCES\n'
  csvContent += 'Source,Count\n'
  data.leadsBySource.forEach((row: any) => {
    csvContent += `${row.source},${row.count}\n`
  })
  csvContent += '\n'

  // Opportunity Pipeline Section
  csvContent += 'OPPORTUNITY PIPELINE\n'
  csvContent += 'Stage,Total Value,Count\n'
  data.opportunityPipeline.forEach((row: any) => {
    csvContent += `${row.stage},"${formatCurrency(row.value)}",${row.count}\n`
  })

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
    ['Total Revenue', formatCurrency(data.dashboard.totalRevenue), `${data.dashboard.revenueChange >= 0 ? '+' : ''}${data.dashboard.revenueChange}%`],
    ['Total Events', data.dashboard.totalEvents.toString(), `${data.dashboard.eventsChange >= 0 ? '+' : ''}${data.dashboard.eventsChange}%`],
    ['Active Leads', data.dashboard.activeLeads.toString(), `${data.dashboard.leadsChange >= 0 ? '+' : ''}${data.dashboard.leadsChange}%`],
    ['Conversion Rate', `${data.dashboard.conversionRate}%`, '-']
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

  const tableData = data.revenueByMonth.map((row: any) => [
    row.month,
    formatCurrency(row.revenue)
  ])

  autoTable(doc, {
    head: [['Month', 'Revenue']],
    body: tableData,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 10 }
  })

  downloadPDF(doc, filename)
}

/**
 * Export lead sources to PDF
 */
export function exportLeadSourcesPDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `lead-sources-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Lead Sources', getDateRangeLabel(dateRange))

  const tableData = data.leadsBySource.map((row: any) => [
    row.source,
    row.count.toString()
  ])

  const total = data.leadsBySource.reduce((sum: number, row: any) => sum + row.count, 0)
  tableData.push(['TOTAL', total.toString()])

  autoTable(doc, {
    head: [['Source', 'Count']],
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
 * Export opportunity pipeline to PDF
 */
export function exportOpportunityPipelinePDF(data: any, dateRange: string): void {
  const doc = new jsPDF()
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `opportunity-pipeline-${dateRange}-${timestamp}.pdf`

  addPDFHeader(doc, 'Opportunity Pipeline', getDateRangeLabel(dateRange))

  const tableData = data.opportunityPipeline.map((row: any) => [
    row.stage,
    formatCurrency(row.value),
    row.count.toString()
  ])

  const totalValue = data.opportunityPipeline.reduce((sum: number, row: any) => sum + row.value, 0)
  const totalCount = data.opportunityPipeline.reduce((sum: number, row: any) => sum + row.count, 0)
  tableData.push(['TOTAL', formatCurrency(totalValue), totalCount.toString()])

  autoTable(doc, {
    head: [['Stage', 'Total Value', 'Count']],
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
    ['Total Revenue', formatCurrency(data.dashboard.totalRevenue), `${data.dashboard.revenueChange >= 0 ? '+' : ''}${data.dashboard.revenueChange}%`],
    ['Total Events', data.dashboard.totalEvents.toString(), `${data.dashboard.eventsChange >= 0 ? '+' : ''}${data.dashboard.eventsChange}%`],
    ['Active Leads', data.dashboard.activeLeads.toString(), `${data.dashboard.leadsChange >= 0 ? '+' : ''}${data.dashboard.leadsChange}%`],
    ['Conversion Rate', `${data.dashboard.conversionRate}%`, '-']
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

  const revenueData = data.revenueByMonth.map((row: any) => [row.month, formatCurrency(row.revenue)])

  autoTable(doc, {
    head: [['Month', 'Revenue']],
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

  // Lead Sources
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Lead Sources', 14, finalY + 15)

  const leadData = data.leadsBySource.map((row: any) => [row.source, row.count.toString()])

  autoTable(doc, {
    head: [['Source', 'Count']],
    body: leadData,
    startY: finalY + 20,
    theme: 'striped',
    headStyles: { fillColor: [52, 125, 196] },
    styles: { fontSize: 9 }
  })

  // Opportunity Pipeline
  finalY = (doc as any).lastAutoTable.finalY || finalY + 20
  if (finalY > 220) {
    doc.addPage()
    finalY = 20
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Opportunity Pipeline', 14, finalY + 15)

  const pipelineData = data.opportunityPipeline.map((row: any) => [
    row.stage,
    formatCurrency(row.value),
    row.count.toString()
  ])

  autoTable(doc, {
    head: [['Stage', 'Total Value', 'Count']],
    body: pipelineData,
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
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year'
  }
  return labels[range] || range
}
