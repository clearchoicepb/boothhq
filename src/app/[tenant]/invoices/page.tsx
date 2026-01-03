'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { KPICard, KPICardGrid } from '@/components/ui/kpi-card'
import { Plus, FileText, DollarSign, Search, Filter, Calendar, ChevronDown, AlertTriangle, Eye } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { formatDate, parseLocalDate, getTodayEST } from '@/lib/utils/date-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('invoices')

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: 'event' | 'general'
  opportunity_id: string | null
  account_id: string | null
  contact_id: string | null
  event_id: string | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_amount: number
  notes: string | null
  opportunity_name: string | null
  account_name: string | null
  contact_name: string | null
  event_name: string | null
  event?: {
    id: string
    title: string
  } | null
  created_at: string
}

type ViewMode = 'outstanding' | 'all'

export default function InvoicesPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'general'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('outstanding')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)

  // Generate month options (current month + next 6 months)
  const monthOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Months' }]
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  useEffect(() => {
    if (session && tenant) {
      fetchInvoices()
    }
  }, [session, tenant, viewMode, selectedMonth])

  const fetchInvoices = async () => {
    try {
      setLocalLoading(true)
      const params = new URLSearchParams()

      // Sort by due_date ascending for outstanding view (soonest due first)
      if (viewMode === 'outstanding') {
        params.set('outstanding', 'true')
        params.set('sort_by', 'due_date')
        params.set('sort_order', 'asc')
      } else {
        params.set('sort_by', 'created_at')
        params.set('sort_order', 'desc')
      }

      if (selectedMonth !== 'all') {
        params.set('month', selectedMonth)
      }

      const response = await fetch(`/api/invoices?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }

      const data = await response.json()
      setInvoices(data)
    } catch (error) {
      log.error({ error }, 'Error fetching invoices')
    } finally {
      setLocalLoading(false)
    }
  }

  // Calculate KPI data
  const kpiData = useMemo(() => {
    const today = getTodayEST()
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    let outstandingTotal = 0
    let outstandingCount = 0
    let overdueTotal = 0
    let overdueCount = 0
    let dueThisMonthTotal = 0
    let dueThisMonthCount = 0

    invoices.forEach(inv => {
      const isOutstanding = inv.status !== 'paid' && inv.status !== 'cancelled'
      const balance = inv.balance_amount ?? (inv.total_amount - (inv.paid_amount || 0))

      if (isOutstanding && balance > 0) {
        outstandingTotal += balance
        outstandingCount++

        const dueDate = parseLocalDate(inv.due_date)

        // Check if overdue
        if (dueDate < today) {
          overdueTotal += balance
          overdueCount++
        }

        // Check if due this month
        if (dueDate >= currentMonthStart && dueDate <= currentMonthEnd) {
          dueThisMonthTotal += balance
          dueThisMonthCount++
        }
      }
    })

    return {
      outstanding: { total: outstandingTotal, count: outstandingCount },
      overdue: { total: overdueTotal, count: overdueCount },
      dueThisMonth: { total: dueThisMonthTotal, count: dueThisMonthCount }
    }
  }, [invoices])

  // Filter invoices client-side for search, status, and type
  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(inv => {
        const invType = inv.invoice_type || (inv.event_id ? 'event' : 'general')
        return invType === typeFilter
      })
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(term) ||
        inv.account_name?.toLowerCase().includes(term) ||
        inv.contact_name?.toLowerCase().includes(term) ||
        inv.opportunity_name?.toLowerCase().includes(term) ||
        inv.event_name?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [invoices, searchTerm, statusFilter, typeFilter])

  // Get due date status badge
  const getDueDateStatus = (dueDate: string, status: string) => {
    if (status === 'paid') {
      return { label: 'Paid', className: 'bg-green-100 text-green-800' }
    }
    if (status === 'cancelled') {
      return { label: 'Cancelled', className: 'bg-gray-100 text-gray-600' }
    }

    const due = parseLocalDate(dueDate)
    const today = getTodayEST()
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: 'Overdue', className: 'bg-red-100 text-red-800' }
    if (diffDays === 0) return { label: 'Due Today', className: 'bg-yellow-100 text-yellow-800' }
    if (diffDays <= 7) return { label: `Due in ${diffDays}d`, className: 'bg-orange-100 text-orange-800' }
    return { label: formatDate(dueDate), className: 'bg-gray-100 text-gray-800' }
  }

  // Check if invoice is overdue
  const isInvoiceOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
    const dueDate = parseLocalDate(invoice.due_date)
    const today = getTodayEST()
    return dueDate < today
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getSelectedMonthLabel = () => {
    const option = monthOptions.find(opt => opt.value === selectedMonth)
    return option?.label || 'All Months'
  }

  if (status === 'loading' || loading || localLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!session || !tenant) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">Please sign in to access this page.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AccessGuard module="invoices" action="view">
      <AppLayout>
        <div className="px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 mr-3 text-[#347dc4]" />
                  Invoices
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage and track your invoices
                </p>
              </div>
              <Link href={`/${tenantSubdomain}/invoices/new`}>
                <Button className="bg-[#347dc4] hover:bg-[#2c6aa3]">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="mb-6">
            <KPICardGrid columns={3}>
              <KPICard
                label="Outstanding"
                value={formatCurrency(kpiData.outstanding.total)}
                icon={<DollarSign />}
                subtitle={`${kpiData.outstanding.count} invoice${kpiData.outstanding.count !== 1 ? 's' : ''}`}
                size="compact"
              />
              <KPICard
                label="Overdue"
                value={formatCurrency(kpiData.overdue.total)}
                icon={<AlertTriangle />}
                subtitle={`${kpiData.overdue.count} invoice${kpiData.overdue.count !== 1 ? 's' : ''}`}
                size="compact"
                className={kpiData.overdue.count > 0 ? 'border-red-200 bg-red-50' : ''}
              />
              <KPICard
                label="Due This Month"
                value={formatCurrency(kpiData.dueThisMonth.total)}
                icon={<Calendar />}
                subtitle={`${kpiData.dueThisMonth.count} invoice${kpiData.dueThisMonth.count !== 1 ? 's' : ''}`}
                size="compact"
              />
            </KPICardGrid>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900"
                />
              </div>

              {/* View Mode Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowViewDropdown(!showViewDropdown)}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-900"
                >
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-2 text-gray-400" />
                    {viewMode === 'outstanding' ? 'Outstanding' : 'All Invoices'}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {showViewDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setViewMode('outstanding')
                          setShowViewDropdown(false)
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          viewMode === 'outstanding' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Outstanding
                      </button>
                      <button
                        onClick={() => {
                          setViewMode('all')
                          setShowViewDropdown(false)
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          viewMode === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        All Invoices
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Month Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                  className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-900"
                >
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {getSelectedMonthLabel()}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {showMonthDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 max-h-60 overflow-auto">
                    <div className="py-1">
                      {monthOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSelectedMonth(option.value)
                            setShowMonthDropdown(false)
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            selectedMonth === option.value ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'event' | 'general')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900"
                >
                  <option value="all">All Types</option>
                  <option value="event">Event Invoices</option>
                  <option value="general">General Invoices</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#347dc4] focus:border-transparent text-gray-900"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          {filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'No invoices found' : 'No invoices yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first invoice to get started'}
              </p>
              {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <Link href={`/${tenantSubdomain}/invoices/new`}>
                  <Button className="bg-[#347dc4] hover:bg-[#2c6aa3]">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => {
                      const invoiceType = invoice.invoice_type || (invoice.event_id ? 'event' : 'general')
                      const isGeneral = invoiceType === 'general'
                      const isOverdue = isInvoiceOverdue(invoice)
                      const dueDateStatus = getDueDateStatus(invoice.due_date, invoice.status)
                      const balance = invoice.balance_amount ?? (invoice.total_amount - (invoice.paid_amount || 0))
                      const paidAmount = invoice.paid_amount || 0

                      return (
                        <tr
                          key={invoice.id}
                          className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/${tenantSubdomain}/invoices/${invoice.id}`}
                                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6aa3]"
                              >
                                {invoice.invoice_number}
                              </Link>
                              {isOverdue && (
                                <span className="text-xs text-red-600 font-medium">(Overdue)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isGeneral ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <FileText className="h-3 w-3" />
                                General
                              </span>
                            ) : invoice.event ? (
                              <Link
                                href={`/${tenantSubdomain}/events/${invoice.event.id}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                              >
                                <Calendar className="h-3 w-3" />
                                {invoice.event.title || invoice.event_name || 'Event'}
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Calendar className="h-3 w-3" />
                                Event
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {invoice.account_name || invoice.contact_name || '-'}
                            </div>
                            {invoice.opportunity_name && (
                              <div className="text-xs text-gray-500">{invoice.opportunity_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${dueDateStatus.className}`}>
                              {dueDateStatus.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                            {formatCurrency(paidAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {formatCurrency(balance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                              {getStatusLabel(invoice.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/${tenantSubdomain}/invoices/${invoice.id}`}
                              className="text-[#347dc4] hover:text-[#2c6aa3]"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900">
                        Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-green-600">
                        {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0))}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(filteredInvoices.reduce((sum, inv) => {
                          const balance = inv.balance_amount ?? (inv.total_amount - (inv.paid_amount || 0))
                          return sum + balance
                        }, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </AccessGuard>
  )
}
