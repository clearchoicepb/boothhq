'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Filter,
  ChevronDown,
  Settings,
  X
} from 'lucide-react'
import {
  exportCompleteDashboard,
  exportDashboardSummary,
  exportRevenueTrend,
  exportEventsTrend,
  exportInvoicesByStatus,
  exportCompleteDashboardPDF,
  exportDashboardSummaryPDF,
  exportRevenueTrendPDF,
  exportEventsTrendPDF,
  exportInvoicesByStatusPDF
} from '@/lib/csv-export'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

type DateRange = 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'yesterday' | 'last_week' | 'last_quarter' | 'last_year' | 'custom'
type ReportType = 'standard' | 'sales' | 'marketing' | 'pipeline' | 'financial'

interface ReportData {
  dashboard: {
    totalRevenueGenerated: number // Sum of all invoices created in period
    totalPaymentsReceived: number // Sum of all payments received in period
    totalEventsBooked: number // Count of opportunities won in period
    totalScheduledEvents: number // Count of event days in period
    revenueGeneratedChange: number
    paymentsReceivedChange: number
    eventsBookedChange: number
    scheduledEventsChange: number
  }
  revenueByMonth: Array<{ month: string; revenue: number; payments: number }>
  eventsByMonth: Array<{ month: string; booked: number; scheduled: number }>
  paymentsByMonth: Array<{ month: string; amount: number }>
  invoicesByStatus: Array<{ status: string; count: number; amount: number }>
}

interface ReportConfig {
  reportType: ReportType
  dateRange: DateRange
  customStartDate: string
  customEndDate: string
  selectedKPIs: string[]
  includeLeads: boolean
  includeContacts: boolean
  includeAccounts: boolean
  includeOpportunities: boolean
  includeEvents: boolean
  includeInvoices: boolean
  accountFilter: string[]
  leadSourceFilter: string[]
  opportunityStageFilter: string[]
}

export default function ReportsPage() {
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'leads' | 'events' | 'financial'>('dashboard')
  const [dateRange, setDateRange] = useState<DateRange>('this_month')
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Report Configuration State
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    reportType: 'standard',
    dateRange: 'this_month',
    customStartDate: '',
    customEndDate: '',
    selectedKPIs: ['totalRevenueGenerated', 'totalPaymentsReceived', 'totalEventsBooked', 'totalScheduledEvents'],
    includeLeads: true,
    includeContacts: true,
    includeAccounts: true,
    includeOpportunities: true,
    includeEvents: true,
    includeInvoices: true,
    accountFilter: [],
    leadSourceFilter: [],
    opportunityStageFilter: []
  })

  const availableKPIs = [
    { id: 'totalRevenueGenerated', label: 'Total Revenue Generated', icon: DollarSign, description: 'Sum of all invoices created' },
    { id: 'totalPaymentsReceived', label: 'Total Payments Received', icon: DollarSign, description: 'Sum of all payments received' },
    { id: 'totalEventsBooked', label: 'Total Events Booked', icon: TrendingUp, description: 'Opportunities won' },
    { id: 'totalScheduledEvents', label: 'Total Scheduled Events', icon: Calendar, description: 'Event days scheduled' },
    { id: 'avgDealSize', label: 'Average Deal Size', icon: DollarSign, description: 'Average opportunity value' },
    { id: 'activeLeads', label: 'Active Leads', icon: TrendingUp, description: 'Current active leads' },
    { id: 'conversionRate', label: 'Conversion Rate', icon: BarChart3, description: 'Lead to opportunity %' },
    { id: 'winRate', label: 'Win Rate', icon: TrendingUp, description: 'Opportunities won %' }
  ]

  const reportTypes = [
    { value: 'standard', label: 'Standard Dashboard', description: 'Comprehensive overview of all metrics' },
    { value: 'sales', label: 'Sales Performance', description: 'Focus on revenue and deals' },
    { value: 'marketing', label: 'Marketing Analytics', description: 'Lead generation and conversion' },
    { value: 'pipeline', label: 'Pipeline Analysis', description: 'Opportunity progression and forecasting' },
    { value: 'financial', label: 'Financial Summary', description: 'Revenue, invoices, and financial metrics' }
  ]

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'sales', label: 'Sales & Revenue', icon: DollarSign },
    { id: 'leads', label: 'Leads & Opportunities', icon: TrendingUp },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'financial', label: 'Financial', icon: FileText }
  ]

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      let url = `/api/reports/dashboard?range=${dateRange}`

      // Add custom date parameters if custom range is selected
      if (dateRange === 'custom' && reportConfig.customStartDate && reportConfig.customEndDate) {
        url += `&startDate=${reportConfig.customStartDate}&endDate=${reportConfig.customEndDate}`
      }

      const response = await fetch(url, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        console.error('Error fetching report data:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange, reportConfig.customStartDate, reportConfig.customEndDate])

  const handleExport = (exportType: string, format: 'csv' | 'pdf') => {
    if (!reportData) return

    setIsExportMenuOpen(false)

    if (format === 'pdf') {
      switch (exportType) {
        case 'complete':
          exportCompleteDashboardPDF(reportData, dateRange)
          break
        case 'summary':
          exportDashboardSummaryPDF(reportData, dateRange)
          break
        case 'revenue':
          exportRevenueTrendPDF(reportData, dateRange)
          break
        case 'events':
          exportEventsTrendPDF(reportData, dateRange)
          break
        case 'invoices':
          exportInvoicesByStatusPDF(reportData, dateRange)
          break
        default:
          exportCompleteDashboardPDF(reportData, dateRange)
      }
    } else {
      switch (exportType) {
        case 'complete':
          exportCompleteDashboard(reportData, dateRange)
          break
        case 'summary':
          exportDashboardSummary(reportData, dateRange)
          break
        case 'revenue':
          exportRevenueTrend(reportData, dateRange)
          break
        case 'events':
          exportEventsTrend(reportData, dateRange)
          break
        case 'invoices':
          exportInvoicesByStatus(reportData, dateRange)
          break
        default:
          exportCompleteDashboard(reportData, dateRange)
      }
    }
  }

  const toggleKPI = (kpiId: string) => {
    setReportConfig(prev => ({
      ...prev,
      selectedKPIs: prev.selectedKPIs.includes(kpiId)
        ? prev.selectedKPIs.filter(id => id !== kpiId)
        : [...prev.selectedKPIs, kpiId]
    }))
  }

  const applyConfiguration = () => {
    // Update dateRange if custom dates are set
    if (reportConfig.dateRange === 'custom' && reportConfig.customStartDate && reportConfig.customEndDate) {
      setDateRange('custom')
    } else {
      setDateRange(reportConfig.dateRange)
    }
    setIsConfigPanelOpen(false)
    fetchReportData()
  }

  const COLORS = ['#347dc4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  if (loading || !reportData) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-[#347dc4]" />
                  Reports & Analytics
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Track performance and analyze business metrics
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Date Range Quick Selector */}
                <select
                  value={dateRange}
                  onChange={(e) => {
                    const newRange = e.target.value as DateRange
                    setDateRange(newRange)
                    setReportConfig(prev => ({ ...prev, dateRange: newRange }))
                    // Open config panel for custom range
                    if (newRange === 'custom') {
                      setIsConfigPanelOpen(true)
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                >
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_week">Last Week</option>
                  <option value="last_quarter">Last Quarter</option>
                  <option value="last_year">Last Year</option>
                  <option value="custom">Custom Range...</option>
                </select>

                {/* Configure Report Button */}
                <button
                  onClick={() => setIsConfigPanelOpen(true)}
                  className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Report
                </button>

                {/* Export Button with Dropdown */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </button>

                  {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {/* Complete Dashboard Report */}
                      <div className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-1">Complete Dashboard Report</div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleExport('complete', 'csv')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExport('complete', 'pdf')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            PDF
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* KPI Summary Only */}
                      <div className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-1">KPI Summary Only</div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleExport('summary', 'csv')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExport('summary', 'pdf')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            PDF
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Revenue Trend Data */}
                      <div className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-1">Revenue Trend Data</div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleExport('revenue', 'csv')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExport('revenue', 'pdf')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            PDF
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Events Trend Data */}
                      <div className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-1">Events Trend Data</div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleExport('events', 'csv')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExport('events', 'pdf')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            PDF
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 my-1"></div>

                      {/* Invoices by Status Data */}
                      <div className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-900 mb-1">Invoices by Status Data</div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleExport('invoices', 'csv')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => handleExport('invoices', 'pdf')}
                            className="flex-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-300"
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex space-x-1 border-b border-gray-200">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-[#347dc4] text-[#347dc4]'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue Generated */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Revenue Generated</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${reportData.dashboard.totalRevenueGenerated.toLocaleString()}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.revenueGeneratedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.revenueGeneratedChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.revenueGeneratedChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Total Payments Received */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Payments Received</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${reportData.dashboard.totalPaymentsReceived.toLocaleString()}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.paymentsReceivedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.paymentsReceivedChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.paymentsReceivedChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Total Events Booked */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Events Booked</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {reportData.dashboard.totalEventsBooked}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.eventsBookedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.eventsBookedChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.eventsBookedChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                {/* Total Scheduled Events */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Scheduled Events</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {reportData.dashboard.totalScheduledEvents}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.scheduledEventsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.scheduledEventsChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.scheduledEventsChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue & Payments Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Generated vs Payments Received</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#347dc4"
                      fill="#347dc4"
                      fillOpacity={0.3}
                      name="Revenue Generated ($)"
                    />
                    <Area
                      type="monotone"
                      dataKey="payments"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Payments Received ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Events Booked & Scheduled Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Events Booked vs Scheduled</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.eventsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="booked" fill="#8b5cf6" name="Events Booked" />
                      <Bar dataKey="scheduled" fill="#f59e0b" name="Scheduled Event Days" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.invoicesByStatus}
                        dataKey="amount"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {reportData.invoicesByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales & Revenue Reports</h3>
              <p className="text-gray-600">Detailed sales reports coming soon...</p>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads & Opportunities Reports</h3>
              <p className="text-gray-600">Detailed lead reports coming soon...</p>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Reports</h3>
              <p className="text-gray-600">Detailed event reports coming soon...</p>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Reports</h3>
              <p className="text-gray-600">Detailed financial reports coming soon...</p>
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        {isConfigPanelOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsConfigPanelOpen(false)}
            ></div>

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="w-screen max-w-2xl">
                <div className="flex h-full flex-col bg-white shadow-xl">
                  {/* Header */}
                  <div className="bg-[#347dc4] px-6 py-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-white">Configure Report</h2>
                      <button
                        onClick={() => setIsConfigPanelOpen(false)}
                        className="text-white hover:text-gray-200"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-blue-100">
                      Customize your report settings, KPIs, and data filters
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="space-y-8">
                      {/* Report Type */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Report Type</h3>
                        <div className="space-y-3">
                          {reportTypes.map((type) => (
                            <label
                              key={type.value}
                              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                                reportConfig.reportType === type.value
                                  ? 'border-[#347dc4] bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="reportType"
                                value={type.value}
                                checked={reportConfig.reportType === type.value}
                                onChange={(e) => setReportConfig(prev => ({
                                  ...prev,
                                  reportType: e.target.value as ReportType
                                }))}
                                className="mt-1 h-4 w-4 text-[#347dc4] border-gray-300 focus:ring-[#347dc4]"
                              />
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{type.label}</div>
                                <div className="text-sm text-gray-500">{type.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range</h3>
                        <div className="space-y-4">
                          <select
                            value={reportConfig.dateRange}
                            onChange={(e) => setReportConfig(prev => ({
                              ...prev,
                              dateRange: e.target.value as DateRange
                            }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                          >
                            <option value="this_week">This Week</option>
                            <option value="this_month">This Month</option>
                            <option value="this_quarter">This Quarter</option>
                            <option value="this_year">This Year</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last_week">Last Week</option>
                            <option value="last_quarter">Last Quarter</option>
                            <option value="last_year">Last Year</option>
                            <option value="custom">Custom Range</option>
                          </select>

                          {reportConfig.dateRange === 'custom' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={reportConfig.customStartDate}
                                  onChange={(e) => setReportConfig(prev => ({
                                    ...prev,
                                    customStartDate: e.target.value
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={reportConfig.customEndDate}
                                  onChange={(e) => setReportConfig(prev => ({
                                    ...prev,
                                    customEndDate: e.target.value
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* KPI Selection */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
                        <p className="text-sm text-gray-600 mb-4">Select which KPIs to display in your report</p>
                        <div className="space-y-3">
                          {availableKPIs.map((kpi) => {
                            const Icon = kpi.icon
                            return (
                              <label
                                key={kpi.id}
                                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                                  reportConfig.selectedKPIs.includes(kpi.id)
                                    ? 'border-[#347dc4] bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={reportConfig.selectedKPIs.includes(kpi.id)}
                                  onChange={() => toggleKPI(kpi.id)}
                                  className="h-4 w-4 mt-0.5 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                                />
                                <Icon className="h-5 w-5 ml-3 mt-0.5 text-gray-600" />
                                <div className="ml-3 flex-1">
                                  <div className="text-sm font-medium text-gray-900">{kpi.label}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{kpi.description}</div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      {/* Data Filters */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Include Data From</h3>
                        <p className="text-sm text-gray-600 mb-4">Select which modules to include in the report</p>
                        <div className="space-y-3">
                          {[
                            { key: 'includeLeads', label: 'Leads', icon: TrendingUp },
                            { key: 'includeContacts', label: 'Contacts', icon: TrendingUp },
                            { key: 'includeAccounts', label: 'Accounts', icon: FileText },
                            { key: 'includeOpportunities', label: 'Opportunities', icon: BarChart3 },
                            { key: 'includeEvents', label: 'Events', icon: Calendar },
                            { key: 'includeInvoices', label: 'Invoices', icon: DollarSign }
                          ].map((item) => {
                            const Icon = item.icon
                            return (
                              <label
                                key={item.key}
                                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={reportConfig[item.key as keyof ReportConfig] as boolean}
                                  onChange={(e) => setReportConfig(prev => ({
                                    ...prev,
                                    [item.key]: e.target.checked
                                  }))}
                                  className="h-4 w-4 text-[#347dc4] border-gray-300 rounded focus:ring-[#347dc4]"
                                />
                                <Icon className="h-5 w-5 ml-3 text-gray-600" />
                                <span className="ml-3 text-sm font-medium text-gray-900">{item.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setIsConfigPanelOpen(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyConfiguration}
                        className="px-4 py-2 bg-[#347dc4] text-white rounded-lg hover:bg-[#2d6aa8] text-sm font-medium"
                      >
                        Apply Configuration
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
