'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

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

interface WeeklyForecastChartProps {
  invoices: ForecastInvoice[]
  onWeekClick?: (week: string | null) => void
  selectedWeek?: string | null
}

interface WeekData {
  week: string
  weekLabel: string
  balance: number
  count: number
  isOverdue: boolean
}

export function WeeklyForecastChart({
  invoices,
  onWeekClick,
  selectedWeek
}: WeeklyForecastChartProps) {
  // Group invoices by week
  const getWeekData = (): WeekData[] => {
    const weeks: WeekData[] = [
      { week: 'overdue', weekLabel: 'Overdue', balance: 0, count: 0, isOverdue: true },
      { week: 'week1', weekLabel: 'Week 1', balance: 0, count: 0, isOverdue: false },
      { week: 'week2', weekLabel: 'Week 2', balance: 0, count: 0, isOverdue: false },
      { week: 'week3', weekLabel: 'Week 3', balance: 0, count: 0, isOverdue: false },
      { week: 'week4', weekLabel: 'Week 4+', balance: 0, count: 0, isOverdue: false },
    ]

    invoices.forEach(invoice => {
      if (invoice.is_overdue) {
        weeks[0].balance += invoice.balance
        weeks[0].count += 1
        return
      }

      const dueDate = new Date(invoice.due_date)
      const dayOfMonth = dueDate.getDate()

      if (dayOfMonth <= 7) {
        weeks[1].balance += invoice.balance
        weeks[1].count += 1
      } else if (dayOfMonth <= 14) {
        weeks[2].balance += invoice.balance
        weeks[2].count += 1
      } else if (dayOfMonth <= 21) {
        weeks[3].balance += invoice.balance
        weeks[3].count += 1
      } else {
        weeks[4].balance += invoice.balance
        weeks[4].count += 1
      }
    })

    // Only include overdue if there are overdue invoices
    return weeks.filter(w => w.count > 0 || !w.isOverdue)
  }

  const weekData = getWeekData()

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
      const weekInfo = weekData.find(w => w.weekLabel === label)
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          <p className="text-sm text-gray-600">
            {formatFullCurrency(payload[0]?.value || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {weekInfo?.count} invoice{weekInfo?.count !== 1 ? 's' : ''}
          </p>
        </div>
      )
    }
    return null
  }

  const handleBarClick = (data: WeekData) => {
    if (onWeekClick) {
      // Toggle selection
      if (selectedWeek === data.week) {
        onWeekClick(null)
      } else {
        onWeekClick(data.week)
      }
    }
  }

  if (weekData.length === 0 || weekData.every(w => w.balance === 0)) {
    return null
  }

  return (
    <div className="p-6 border-b border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-4">Balance Due by Week</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weekData}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="balance"
              radius={[4, 4, 0, 0]}
              cursor={onWeekClick ? 'pointer' : 'default'}
              onClick={(data) => handleBarClick(data as unknown as WeekData)}
            >
              {weekData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isOverdue ? '#EF4444' : '#347dc4'}
                  opacity={selectedWeek && selectedWeek !== entry.week ? 0.4 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {onWeekClick && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {selectedWeek ? 'Click bar again to clear filter' : 'Click a bar to filter the table below'}
        </p>
      )}
    </div>
  )
}
