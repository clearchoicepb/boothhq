'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { KPICard, KPICardGrid } from '@/components/ui/kpi-card'
import { Search, Download, DollarSign, FileText, Calendar, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('reports')

type PresetRange = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom'

interface Payment {
  id: string
  invoice_id: string
  payment_date: string
  invoice_number: string
  account_name: string
  amount: number
  payment_method: string
  reference_number: string | null
  notes: string | null
}

interface SearchResults {
  payments: Payment[]
  totalAmount: number
  count: number
  dateRange: {
    start: string
    end: string
  }
}

const presetOptions: { value: PresetRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

export function PaymentSearch() {
  const { tenant: tenantSubdomain } = useParams()
  const [preset, setPreset] = useState<PresetRange>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [data, setData] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)

  useEffect(() => {
    if (preset !== 'custom') {
      fetchPayments()
    }
  }, [preset])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      let url = `/api/reports/payments-search?preset=${preset}`

      if (preset === 'custom' && customStart && customEnd) {
        url = `/api/reports/payments-search?startDate=${customStart}&endDate=${customEnd}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch payments')
      const result = await response.json()
      setData(result)
    } catch (error) {
      log.error({ error }, 'Error fetching payments')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSearch = () => {
    if (customStart && customEnd) {
      fetchPayments()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getCurrentPresetLabel = () => {
    return presetOptions.find(opt => opt.value === preset)?.label || 'Select Range'
  }

  const exportToCSV = () => {
    if (!data || data.payments.length === 0) return

    const headers = ['Payment Date', 'Invoice #', 'Account', 'Amount', 'Payment Method', 'Reference #']
    const rows = data.payments.map(p => [
      formatDate(p.payment_date),
      p.invoice_number,
      p.account_name,
      p.amount.toFixed(2),
      p.payment_method,
      p.reference_number || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `payments-${preset}-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Search className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Search</h3>
              <p className="text-sm text-gray-500">Search and export payment records</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Preset Selector */}
            <div className="relative">
              <button
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {getCurrentPresetLabel()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>

              {showPresetDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {presetOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPreset(option.value)
                          setShowPresetDropdown(false)
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          preset === option.value
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

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              disabled={!data || data.payments.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Custom Date Range */}
        {preset === 'custom' && (
          <div className="mt-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#347dc4] focus:border-[#347dc4]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#347dc4] focus:border-[#347dc4]"
              />
            </div>
            <button
              onClick={handleCustomSearch}
              disabled={!customStart || !customEnd}
              className="px-4 py-2 bg-[#347dc4] text-white rounded-md text-sm font-medium hover:bg-[#2c6aa8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
        )}
      </div>

      {/* KPI Summary */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <KPICardGrid columns={2}>
          <KPICard
            label="Total Payments"
            value={loading ? '...' : formatCurrency(data?.totalAmount || 0)}
            icon={<DollarSign />}
            loading={loading}
            size="compact"
          />
          <KPICard
            label="Payment Count"
            value={loading ? '...' : String(data?.count || 0)}
            icon={<FileText />}
            loading={loading}
            subtitle="transactions"
            size="compact"
          />
        </KPICardGrid>
      </div>

      {/* Results Table */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#347dc4]"></div>
          </div>
        ) : data?.payments.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No payments found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference #
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{formatDate(payment.payment_date)}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/${tenantSubdomain}/invoices/${payment.invoice_id}`}
                        className="text-sm font-medium text-[#347dc4] hover:underline"
                      >
                        {payment.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{payment.account_name}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {payment.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{payment.reference_number || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900">
                    Total ({data?.count} payments)
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                    {formatCurrency(data?.totalAmount || 0)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
