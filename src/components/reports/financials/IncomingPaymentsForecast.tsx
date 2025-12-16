'use client'

import { useState, useEffect } from 'react'
import { KPICard, KPICardGrid } from '@/components/ui/kpi-card'
import { DollarSign, Calendar, ChevronDown, FileText, AlertCircle, AlertTriangle } from 'lucide-react'
import { WeeklyForecastChart } from './WeeklyForecastChart'

interface ForecastInvoice {
  id: string
  invoice_number: string
  account_name: string
  due_date: string
  total_amount: number
  payments_received: number
  balance: number
  status: string
  is_overdue: boolean
}

interface ForecastData {
  invoices: ForecastInvoice[]
  totalExpected: number
  totalBalance: number
  overdueCount: number
  overdueBalance: number
  monthLabel: string
  isCurrentMonth: boolean
}

export function IncomingPaymentsForecast() {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  // Generate month options (current month + next 6 months)
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      options.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      })
    }
    return options
  }

  const monthOptions = getMonthOptions()

  useEffect(() => {
    fetchForecast()
    setSelectedWeek(null) // Clear week filter when month changes
  }, [selectedMonth])

  const fetchForecast = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/reports/payments-forecast?month=${selectedMonth.month}&year=${selectedMonth.year}`
      )
      if (!response.ok) throw new Error('Failed to fetch forecast')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching forecast:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getSelectedMonthLabel = () => {
    const option = monthOptions.find(
      opt => opt.month === selectedMonth.month && opt.year === selectedMonth.year
    )
    return option?.label || 'Select Month'
  }

  const getDueDateStatus = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: 'Overdue', className: 'bg-red-100 text-red-800' }
    if (diffDays === 0) return { label: 'Due Today', className: 'bg-yellow-100 text-yellow-800' }
    if (diffDays <= 7) return { label: `Due in ${diffDays}d`, className: 'bg-orange-100 text-orange-800' }
    return { label: formatDate(dueDate), className: 'bg-gray-100 text-gray-800' }
  }

  // Filter invoices by selected week
  const getFilteredInvoices = () => {
    if (!data?.invoices || !selectedWeek) return data?.invoices || []

    return data.invoices.filter(invoice => {
      if (selectedWeek === 'overdue') {
        return invoice.is_overdue
      }

      if (invoice.is_overdue) return false

      const dueDate = new Date(invoice.due_date)
      const dayOfMonth = dueDate.getDate()

      switch (selectedWeek) {
        case 'week1':
          return dayOfMonth <= 7
        case 'week2':
          return dayOfMonth > 7 && dayOfMonth <= 14
        case 'week3':
          return dayOfMonth > 14 && dayOfMonth <= 21
        case 'week4':
          return dayOfMonth > 21
        default:
          return true
      }
    })
  }

  const filteredInvoices = getFilteredInvoices()

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Incoming Payments Forecast</h3>
              <p className="text-sm text-gray-500">
                {data?.isCurrentMonth
                  ? 'Invoices due this month plus any overdue balances'
                  : 'Expected payments based on invoice due dates'}
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="relative">
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {getSelectedMonthLabel()}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {showMonthDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  {monthOptions.map((option) => (
                    <button
                      key={`${option.year}-${option.month}`}
                      onClick={() => {
                        setSelectedMonth({ month: option.month, year: option.year })
                        setShowMonthDropdown(false)
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        selectedMonth.month === option.month && selectedMonth.year === option.year
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <KPICardGrid columns={data?.isCurrentMonth && data?.overdueCount > 0 ? 3 : 2}>
          <KPICard
            label="Total Expected"
            value={loading ? '...' : formatCurrency(data?.totalExpected || 0)}
            icon={<FileText />}
            loading={loading}
            subtitle={`${data?.invoices.length || 0} invoices`}
            size="compact"
          />
          <KPICard
            label="Outstanding Balance"
            value={loading ? '...' : formatCurrency(data?.totalBalance || 0)}
            icon={<DollarSign />}
            loading={loading}
            subtitle="Remaining to collect"
            size="compact"
          />
          {data?.isCurrentMonth && data?.overdueCount > 0 && (
            <KPICard
              label="Overdue"
              value={loading ? '...' : formatCurrency(data?.overdueBalance || 0)}
              icon={<AlertTriangle />}
              loading={loading}
              subtitle={`${data?.overdueCount} overdue invoice${data?.overdueCount > 1 ? 's' : ''}`}
              size="compact"
              className="border-red-200 bg-red-50"
            />
          )}
        </KPICardGrid>
      </div>

      {/* Weekly Chart */}
      {!loading && data?.invoices && data.invoices.length > 0 && (
        <WeeklyForecastChart
          invoices={data.invoices}
          onWeekClick={setSelectedWeek}
          selectedWeek={selectedWeek}
        />
      )}

      {/* Invoice List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#347dc4]"></div>
          </div>
        ) : data?.invoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No invoices with outstanding balances due in {data?.monthLabel}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No invoices match the selected filter</p>
            <button
              onClick={() => setSelectedWeek(null)}
              className="mt-2 text-sm text-[#347dc4] hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const dueDateStatus = getDueDateStatus(invoice.due_date)
                  return (
                    <tr
                      key={invoice.id}
                      className={`hover:bg-gray-50 ${invoice.is_overdue ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#347dc4]">
                            {invoice.invoice_number}
                          </span>
                          {invoice.is_overdue && (
                            <span className="text-xs text-red-600 font-medium">(Overdue)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{invoice.account_name}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${dueDateStatus.className}`}>
                          {dueDateStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-900">{formatCurrency(invoice.total_amount)}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-green-600">{formatCurrency(invoice.payments_received)}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${invoice.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(invoice.balance)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900">
                    {selectedWeek ? (
                      <span>
                        Showing {filteredInvoices.length} of {data?.invoices.length} invoices
                        <button
                          onClick={() => setSelectedWeek(null)}
                          className="ml-2 text-[#347dc4] hover:underline"
                        >
                          (Clear filter)
                        </button>
                      </span>
                    ) : (
                      'Total'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.payments_received, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.balance, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
