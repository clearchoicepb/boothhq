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
  ChevronDown
} from 'lucide-react'
import {
  exportCompleteDashboard,
  exportDashboardSummary,
  exportRevenueTrend,
  exportLeadSources,
  exportOpportunityPipeline
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

type DateRange = '7d' | '30d' | '90d' | '1y' | 'custom'

interface ReportData {
  dashboard: {
    totalRevenue: number
    totalEvents: number
    activeLeads: number
    conversionRate: number
    revenueChange: number
    eventsChange: number
    leadsChange: number
  }
  revenueByMonth: Array<{ month: string; revenue: number }>
  leadsBySource: Array<{ source: string; count: number }>
  opportunityPipeline: Array<{ stage: string; value: number; count: number }>
  upcomingEvents: Array<{ date: string; count: number }>
}

export default function ReportsPage() {
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'leads' | 'events' | 'financial'>('dashboard')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'sales', label: 'Sales & Revenue', icon: DollarSign },
    { id: 'leads', label: 'Leads & Opportunities', icon: TrendingUp },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'financial', label: 'Financial', icon: FileText }
  ]

  const dateRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ]

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

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
      const response = await fetch(`/api/reports/dashboard?range=${dateRange}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (exportType: string) => {
    if (!reportData) return

    setIsExportMenuOpen(false)

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
      case 'leads':
        exportLeadSources(reportData, dateRange)
        break
      case 'pipeline':
        exportOpportunityPipeline(reportData, dateRange)
        break
      default:
        exportCompleteDashboard(reportData, dateRange)
    }
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
                {/* Date Range Selector */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:bg-gray-50"
                >
                  {dateRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>

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
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => handleExport('complete')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Complete Dashboard Report
                      </button>
                      <button
                        onClick={() => handleExport('summary')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        KPI Summary Only
                      </button>
                      <button
                        onClick={() => handleExport('revenue')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Revenue Trend Data
                      </button>
                      <button
                        onClick={() => handleExport('leads')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Lead Sources Data
                      </button>
                      <button
                        onClick={() => handleExport('pipeline')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Opportunity Pipeline Data
                      </button>
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
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${reportData.dashboard.totalRevenue.toLocaleString()}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.revenueChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Events</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {reportData.dashboard.totalEvents}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.eventsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.eventsChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.eventsChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Leads</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {reportData.dashboard.activeLeads}
                      </p>
                      <p className={`text-xs mt-2 ${reportData.dashboard.leadsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.dashboard.leadsChange >= 0 ? '↑' : '↓'} {Math.abs(reportData.dashboard.leadsChange)}% from last period
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Conversion Rate</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {reportData.dashboard.conversionRate}%
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Lead to opportunity
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
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
                      name="Revenue ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Lead Sources & Opportunity Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.leadsBySource}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {reportData.leadsBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Opportunity Pipeline</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.opportunityPipeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#347dc4" name="Value ($)" />
                    </BarChart>
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
      </div>
    </AppLayout>
  )
}
