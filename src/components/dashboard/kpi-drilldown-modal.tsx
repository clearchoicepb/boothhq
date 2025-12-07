'use client'

import { Modal } from '@/components/ui/modal'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { useDashboardDrilldown } from '@/hooks/useDashboardDrilldown'
import type {
  DrilldownType,
  DrilldownPeriod,
  EventOccurringRecord,
  EventBookedRecord,
  OpportunityRecord
} from '@/hooks/useDashboardDrilldown'
import { formatDateShort } from '@/lib/utils/date-utils'

interface KPIDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  type: DrilldownType | null
  period: DrilldownPeriod
  tenantSubdomain: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatDateTime(dateString: string): string {
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

function getModalTitle(type: DrilldownType | null, periodLabel: string): string {
  switch (type) {
    case 'events-occurring':
      return `Events Occurring - ${periodLabel}`
    case 'events-booked':
      return `Events Booked - ${periodLabel}`
    case 'total-opportunities':
      return 'Active Opportunities'
    case 'new-opportunities':
      return `New Opportunities - ${periodLabel}`
    default:
      return 'Details'
  }
}

function getEmptyMessage(type: DrilldownType | null): string {
  switch (type) {
    case 'events-occurring':
      return 'No events scheduled for this period'
    case 'events-booked':
      return 'No events booked in this period'
    case 'total-opportunities':
      return 'No active opportunities'
    case 'new-opportunities':
      return 'No new opportunities in this period'
    default:
      return 'No data found'
  }
}

// Events Occurring Table
function EventsOccurringTable({
  records,
  tenantSubdomain
}: {
  records: EventOccurringRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Client/Account
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Venue
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Type
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDateShort(record.eventDate)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/events/${record.eventId}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.eventName}
              </Link>
              {record.eventCategory && (
                <div className="mt-1">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: (record.eventCategoryColor || '#6b7280') + '20',
                      color: record.eventCategoryColor || '#6b7280'
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: record.eventCategoryColor || '#6b7280' }}
                    />
                    {record.eventCategory}
                  </span>
                </div>
              )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.location || <span className="text-gray-400">No venue</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              {record.eventType ? (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {record.eventType}
                </span>
              ) : (
                <span className="text-gray-400 text-xs">No type</span>
              )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                record.status === 'completed' ? 'bg-green-100 text-green-800' :
                record.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                record.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                record.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {record.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Events Booked Table
function EventsBookedTable({
  records,
  tenantSubdomain
}: {
  records: EventBookedRecord[]
  tenantSubdomain: string
}) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Date Booked
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Event Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Client/Account
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Revenue
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDateTime(record.createdAt)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <Link
                href={`/${tenantSubdomain}/events/${record.id}`}
                className="text-sm font-medium text-[#347dc4] hover:text-[#2c6ba8] hover:underline"
              >
                {record.eventName}
              </Link>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.eventDate ? formatDateShort(record.eventDate) : <span className="text-gray-400">TBD</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
              {record.accountName || <span className="text-gray-400">No account</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
              {record.revenue > 0 ? formatCurrency(record.revenue) : <span className="text-gray-400">-</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Opportunities Table
function OpportunitiesTable({
  records,
  tenantSubdomain,
  showExpectedClose = false
}: {
  records: OpportunityRecord[]
  tenantSubdomain: string
  showExpectedClose?: boolean
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
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Value
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Stage
          </th>
          {showExpectedClose && (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expected Close
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {formatDateTime(record.createdAt)}
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
              {record.value > 0 ? formatCurrency(record.value) : <span className="text-gray-400">-</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              {record.stageColor ? (
                <span
                  className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  style={{
                    backgroundColor: `${record.stageColor}20`,
                    color: record.stageColor
                  }}
                >
                  {record.stageName || record.stage?.replace(/_/g, ' ')}
                </span>
              ) : (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  record.stage === 'closed_won' ? 'bg-green-100 text-green-800' :
                  record.stage === 'closed_lost' ? 'bg-red-100 text-red-800' :
                  record.stage === 'negotiation' ? 'bg-yellow-100 text-yellow-800' :
                  record.stage === 'proposal' ? 'bg-purple-100 text-purple-800' :
                  record.stage === 'qualification' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {record.stageName || record.stage?.replace(/_/g, ' ')}
                </span>
              )}
            </td>
            {showExpectedClose && (
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                {record.expectedCloseDate ? formatDateShort(record.expectedCloseDate) : <span className="text-gray-400">-</span>}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function KPIDrilldownModal({
  isOpen,
  onClose,
  type,
  period,
  tenantSubdomain
}: KPIDrilldownModalProps) {
  const { data, isLoading, error } = useDashboardDrilldown({
    type,
    period,
    enabled: isOpen && type !== null
  })

  const title = getModalTitle(type, data?.periodLabel || period)
  const isEmpty = !isLoading && (!data?.records || data.records.length === 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="sm:max-w-5xl">
      {/* Subtitle showing period */}
      {data?.periodLabel && type !== 'total-opportunities' && (
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          Showing: {data.periodLabel}
        </p>
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
            {type === 'events-occurring' && (
              <EventsOccurringTable
                records={data.records as EventOccurringRecord[]}
                tenantSubdomain={tenantSubdomain}
              />
            )}
            {type === 'events-booked' && (
              <EventsBookedTable
                records={data.records as EventBookedRecord[]}
                tenantSubdomain={tenantSubdomain}
              />
            )}
            {type === 'total-opportunities' && (
              <OpportunitiesTable
                records={data.records as OpportunityRecord[]}
                tenantSubdomain={tenantSubdomain}
                showExpectedClose
              />
            )}
            {type === 'new-opportunities' && (
              <OpportunitiesTable
                records={data.records as OpportunityRecord[]}
                tenantSubdomain={tenantSubdomain}
              />
            )}
          </div>

          {/* Footer with totals */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-gray-900">{data.totalCount} {data.totalCount === 1 ? 'item' : 'items'}</span>
            </span>
            {data.totalRevenue !== undefined && data.totalRevenue > 0 && (
              <span className="text-gray-600">
                {type === 'total-opportunities' ? 'Pipeline Value' : type === 'events-booked' ? 'Total Revenue' : 'Total Value'}:{' '}
                <span className="font-semibold text-gray-900">{formatCurrency(data.totalRevenue)}</span>
              </span>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
