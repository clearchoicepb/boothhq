/**
 * CSV Export Utilities
 * Converts data to CSV format and triggers download
 */

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
