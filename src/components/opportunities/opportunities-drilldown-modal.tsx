'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { useOpportunitiesDrilldown } from '@/hooks/useOpportunitiesDrilldown'
import type {
  OpportunityDrilldownType,
  OpportunityDrilldownRecord
} from '@/hooks/useOpportunitiesDrilldown'
import type { TimePeriod } from '@/components/ui/kpi-card'

type ValueDisplayMode = 'actual' | 'weighted'

interface OpportunitiesDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  type: OpportunityDrilldownType | null
  period: TimePeriod
  tenantSubdomain: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

function getEmptyMessage(type: OpportunityDrilldownType | null): string {
  switch (type) {
    case 'new-opps':
      return 'No new opportunities in this period'
    case 'open-pipeline':
      return 'No open opportunities in the pipeline'
    case 'won':
      return 'No won opportunities in this period'
    case 'lost':
      return 'No lost opportunities in this period'
    case 'win-rate':
      return 'No closed opportunities in this period'
    case 'avg-days':
      return 'No won opportunities to calculate average days'
    case 'avg-deal':
      return 'No won opportunities to calculate average deal size'
    case 'closing-soon':
      return 'No opportunities closing in the next 7 days'
    default:
      return 'No data found'
  }
}

// Table for New Opps
function NewOppsTable({
  records,
  tenantSubdomain,
  valueMode
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
  valueMode: ValueDisplayMode
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Created Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Date
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            {valueMode === 'weighted' ? 'Weighted Value' : 'Amount'}
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Stage
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.createdAt)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.eventDate ? formatDate(record.eventDate) : <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(valueMode === 'weighted' ? record.weightedValue : record.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.stageName}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Open Pipeline
function OpenPipelineTable({
  records,
  tenantSubdomain,
  valueMode
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
  valueMode: ValueDisplayMode
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Created Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Date
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            {valueMode === 'weighted' ? 'Weighted Value' : 'Amount'}
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Stage
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Probability
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.createdAt)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.eventDate ? formatDate(record.eventDate) : <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(valueMode === 'weighted' ? record.weightedValue : record.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.stageName}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
              {record.probability}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Won opportunities
function WonTable({
  records,
  tenantSubdomain
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Close Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Date
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Days to Close
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.actualCloseDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.eventDate ? formatDate(record.eventDate) : <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(record.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
              {record.daysToClose !== null ? `${record.daysToClose} days` : <span className="text-gray-400">-</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Lost opportunities
function LostTable({
  records,
  tenantSubdomain
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Close Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Date
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Close Reason
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.actualCloseDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.eventDate ? formatDate(record.eventDate) : <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(record.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.closeReason || <span className="text-gray-400">No reason provided</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Win Rate (all closed opportunities)
function WinRateTable({
  records,
  tenantSubdomain
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Close Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            Result
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.actualCloseDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(record.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-center">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                record.result === 'won'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {record.result === 'won' ? 'Won' : 'Lost'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Avg Days to Close
function AvgDaysTable({
  records,
  tenantSubdomain
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Created Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Close Date
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Days to Close
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {formatDate(record.createdAt)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {formatDate(record.actualCloseDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {record.daysToClose !== null ? `${record.daysToClose} days` : '-'}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(record.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Avg Deal Size
function AvgDealTable({
  records,
  tenantSubdomain
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Close Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Amount
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.actualCloseDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(record.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Table for Closing Soon
function ClosingSoonTable({
  records,
  tenantSubdomain,
  valueMode
}: {
  records: OpportunityDrilldownRecord[]
  tenantSubdomain: string
  valueMode: ValueDisplayMode
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Expected Close
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Opportunity Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            {valueMode === 'weighted' ? 'Weighted Value' : 'Amount'}
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Stage
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Days Until Close
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDate(record.expectedCloseDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/opportunities/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.name}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {formatCurrency(valueMode === 'weighted' ? record.weightedValue : record.amount)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.stageName}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
              {record.daysUntilClose !== null ? (
                <span className={record.daysUntilClose <= 2 ? 'text-orange-600 font-medium' : 'text-gray-700'}>
                  {record.daysUntilClose === 0 ? 'Today' : record.daysUntilClose === 1 ? 'Tomorrow' : `${record.daysUntilClose} days`}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function OpportunitiesDrilldownModal({
  isOpen,
  onClose,
  type,
  period,
  tenantSubdomain
}: OpportunitiesDrilldownModalProps) {
  const [valueMode, setValueMode] = useState<ValueDisplayMode>('actual')
  const { data, isLoading, error } = useOpportunitiesDrilldown({
    type,
    period,
    enabled: isOpen && type !== null
  })

  const title = data?.periodLabel || 'Details'
  const isEmpty = !isLoading && (!data?.records || data.records.length === 0)

  // Types that show value toggle
  const showValueToggle = type === 'new-opps' || type === 'open-pipeline' || type === 'closing-soon'

  // Render the appropriate footer based on type
  const renderFooter = () => {
    if (!data) return null

    switch (type) {
      case 'new-opps':
      case 'open-pipeline':
      case 'closing-soon':
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{data.totalCount} {data.totalCount === 1 ? 'opportunity' : 'opportunities'}</span>
            </span>
            <span className="text-gray-600">
              {valueMode === 'weighted' ? 'Weighted Value' : 'Value'}:{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(valueMode === 'weighted' ? data.totalWeightedValue : data.totalValue)}
              </span>
            </span>
          </div>
        )

      case 'won':
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{data.totalCount} won</span>
            </span>
            <span className="text-gray-600">
              Revenue: <span className="font-semibold text-green-600">{formatCurrency(data.totalValue)}</span>
            </span>
          </div>
        )

      case 'lost':
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{data.totalCount} lost</span>
            </span>
            <span className="text-gray-600">
              Value: <span className="font-semibold text-red-600">{formatCurrency(data.totalValue)}</span>
            </span>
          </div>
        )

      case 'win-rate':
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Won: <span className="font-semibold text-green-600">{data.wonCount}</span>
              {' | '}
              Lost: <span className="font-semibold text-red-600">{data.lostCount}</span>
            </span>
            <span className="text-gray-600">
              Win Rate: <span className="font-semibold text-gray-900">{data.winRate ?? 0}%</span>
            </span>
          </div>
        )

      case 'avg-days':
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{data.totalCount} {data.totalCount === 1 ? 'opportunity' : 'opportunities'}</span>
            </span>
            <span className="text-gray-600">
              Average: <span className="font-semibold text-gray-900">{data.avgDaysToClose ?? 0} days</span>
            </span>
          </div>
        )

      case 'avg-deal':
        return (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{data.totalCount} won</span>
              {' | '}
              Revenue: <span className="font-semibold text-gray-900">{formatCurrency(data.totalValue)}</span>
            </span>
            <span className="text-gray-600">
              Average: <span className="font-semibold text-gray-900">{formatCurrency(data.avgDealSize ?? 0)}</span>
            </span>
          </div>
        )

      default:
        return (
          <span className="text-gray-600 text-sm">
            Total: <span className="font-semibold text-gray-900">{data.totalCount} {data.totalCount === 1 ? 'item' : 'items'}</span>
          </span>
        )
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="sm:max-w-5xl">
      {/* Value toggle for applicable types */}
      {showValueToggle && !isLoading && !isEmpty && (
        <div className="flex justify-end mb-3">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setValueMode('actual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-l-md border ${
                valueMode === 'actual'
                  ? 'bg-[#347dc4] text-white border-[#347dc4]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Total Value
            </button>
            <button
              type="button"
              onClick={() => setValueMode('weighted')}
              className={`px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-b border-r ${
                valueMode === 'weighted'
                  ? 'bg-[#347dc4] text-white border-[#347dc4]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Weighted Value
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="py-12 text-center">
          <p className="text-red-500">Failed to load data. Please try again.</p>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !error && (
        <div className="py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">{getEmptyMessage(type)}</p>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && data?.records && data.records.length > 0 && (
        <>
          <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
            {type === 'new-opps' && (
              <NewOppsTable records={data.records} tenantSubdomain={tenantSubdomain} valueMode={valueMode} />
            )}
            {type === 'open-pipeline' && (
              <OpenPipelineTable records={data.records} tenantSubdomain={tenantSubdomain} valueMode={valueMode} />
            )}
            {type === 'won' && (
              <WonTable records={data.records} tenantSubdomain={tenantSubdomain} />
            )}
            {type === 'lost' && (
              <LostTable records={data.records} tenantSubdomain={tenantSubdomain} />
            )}
            {type === 'win-rate' && (
              <WinRateTable records={data.records} tenantSubdomain={tenantSubdomain} />
            )}
            {type === 'avg-days' && (
              <AvgDaysTable records={data.records} tenantSubdomain={tenantSubdomain} />
            )}
            {type === 'avg-deal' && (
              <AvgDealTable records={data.records} tenantSubdomain={tenantSubdomain} />
            )}
            {type === 'closing-soon' && (
              <ClosingSoonTable records={data.records} tenantSubdomain={tenantSubdomain} valueMode={valueMode} />
            )}
          </div>

          {/* Footer with totals */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            {renderFooter()}
          </div>
        </>
      )}
    </Modal>
  )
}
