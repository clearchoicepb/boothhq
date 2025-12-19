'use client'

import { useState, useEffect } from 'react'
import { KPICard, KPICardGrid } from '@/components/ui/kpi-card'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const log = createLogger('reports')

interface MonthlyData {
  month: string
  monthIndex: number
  currentYear: number
  previousYear: number
  change: number
  currentYTD: number
  previousYTD: number
}

interface YoYData {
  currentYear: number
  previousYear: number
  monthlyData: MonthlyData[]
  summary: {
    currentYearTotal: number
    previousYearTotal: number
    ytdChange: number
  }
}

interface TooltipPayloadEntry {
  value?: number
  name?: string
  dataKey?: string
  fill?: string
}

export function YearOverYearChart() {
  const [data, setData] = useState<YoYData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchYoYData()
  }, [])

  const fetchYoYData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports/payments-yoy')
      if (!response.ok) throw new Error('Failed to fetch YoY data')
      const result = await response.json()
      setData(result)
    } catch (error) {
      log.error({ error }, 'Error fetching YoY data')
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

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return `$${value}`
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
    if (active && payload && payload.length) {
      const monthData = data?.monthlyData.find(m => m.month === label)
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#347dc4]" />
              <span className="text-sm text-gray-600">{data?.currentYear}:</span>
              <span className="text-sm font-medium">{formatCurrency(payload[0]?.value || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-sm text-gray-600">{data?.previousYear}:</span>
              <span className="text-sm font-medium">{formatCurrency(payload[1]?.value || 0)}</span>
            </div>
            {monthData && monthData.change !== 0 && (
              <div className={`text-xs mt-1 ${monthData.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {monthData.change > 0 ? '↑' : '↓'} {Math.abs(monthData.change)}% vs prior year
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Year over Year Comparison</h3>
            <p className="text-sm text-gray-500">Comparing payments received by month</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
        </div>
      </div>
    )
  }

  const ytdIsPositive = (data?.summary.ytdChange || 0) >= 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Year over Year Comparison</h3>
            <p className="text-sm text-gray-500">
              Comparing {data?.currentYear} vs {data?.previousYear} payments received
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <KPICardGrid columns={3}>
          <KPICard
            label={`${data?.currentYear} YTD`}
            value={formatCurrency(data?.summary.currentYearTotal || 0)}
            icon={<TrendingUp />}
            size="compact"
          />
          <KPICard
            label={`${data?.previousYear} YTD`}
            value={formatCurrency(data?.summary.previousYearTotal || 0)}
            icon={<TrendingDown />}
            size="compact"
          />
          <KPICard
            label="YoY Change"
            value={`${ytdIsPositive ? '+' : ''}${data?.summary.ytdChange || 0}%`}
            icon={ytdIsPositive ? <TrendingUp /> : <TrendingDown />}
            size="compact"
            trend={{
              direction: ytdIsPositive ? 'up' : 'down',
              value: `${formatCurrency(Math.abs((data?.summary.currentYearTotal || 0) - (data?.summary.previousYearTotal || 0)))}`
            }}
          />
        </KPICardGrid>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data?.monthlyData || []}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-sm text-gray-600">{value}</span>
                )}
              />
              <Bar
                dataKey="currentYear"
                name={`${data?.currentYear}`}
                fill="#347dc4"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="previousYear"
                name={`${data?.previousYear}`}
                fill="#D1D5DB"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="p-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Monthly Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{data?.currentYear}</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{data?.previousYear}</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Change</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">YTD {data?.currentYear}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.monthlyData.map((month) => (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">{month.month}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(month.currentYear)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-600">
                    {formatCurrency(month.previousYear)}
                  </td>
                  <td className="px-3 py-2 text-sm text-right">
                    <span className={`${month.change > 0 ? 'text-green-600' : month.change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {month.change > 0 ? '+' : ''}{month.change}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-600">
                    {formatCurrency(month.currentYTD)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">Total</td>
                <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                  {formatCurrency(data?.summary.currentYearTotal || 0)}
                </td>
                <td className="px-3 py-2 text-sm text-right font-medium text-gray-600">
                  {formatCurrency(data?.summary.previousYearTotal || 0)}
                </td>
                <td className="px-3 py-2 text-sm text-right">
                  <span className={`font-medium ${ytdIsPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {ytdIsPositive ? '+' : ''}{data?.summary.ytdChange}%
                  </span>
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
