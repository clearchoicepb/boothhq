'use client'

import { useState } from 'react'
import { Calendar, DollarSign, Target, TrendingUp } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { KPIDrilldownModal } from './kpi-drilldown-modal'
import type { DrilldownType, DrilldownPeriod } from '@/hooks/useDashboardDrilldown'

type TimePeriod = 'week' | 'month' | 'year'

interface PeriodOption {
  value: TimePeriod
  label: string
}

const periodOptions: PeriodOption[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' }
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

interface KPICardProps {
  title: string
  icon: React.ElementType
  mainValue: number
  secondaryLabel?: string
  secondaryValue?: number
  showPeriodSelector?: boolean
  selectedPeriod?: TimePeriod
  onPeriodChange?: (period: TimePeriod) => void
  formatMainValue?: (value: number) => string
  formatSecondaryValue?: (value: number) => string
  isLoading?: boolean
  onClick?: () => void
}

function KPICard({
  title,
  icon: Icon,
  mainValue,
  secondaryLabel,
  secondaryValue,
  showPeriodSelector = false,
  selectedPeriod = 'month',
  onPeriodChange,
  formatMainValue = formatNumber,
  formatSecondaryValue = formatCurrency,
  isLoading = false,
  onClick
}: KPICardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow p-4 lg:p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-[#347dc4] border border-transparent"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="h-5 w-5 text-[#347dc4]" />
          </div>
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
        {showPeriodSelector && onPeriodChange && (
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value as TimePeriod)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600 focus:ring-1 focus:ring-[#347dc4] focus:border-[#347dc4] cursor-pointer"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          {secondaryLabel && <div className="h-4 bg-gray-200 rounded w-2/3"></div>}
        </div>
      ) : (
        <>
          <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
            {formatMainValue(mainValue)}
          </div>
          {secondaryLabel && secondaryValue !== undefined && (
            <div className="text-sm text-gray-500">
              {secondaryLabel}: <span className="font-medium text-gray-700">{formatSecondaryValue(secondaryValue)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface KPICardsSectionProps {
  tenantSubdomain: string
}

export function KPICardsSection({ tenantSubdomain }: KPICardsSectionProps) {
  const { data: stats, isLoading } = useDashboardStats()

  // Individual period states for each card that has a dropdown
  const [eventsOccurringPeriod, setEventsOccurringPeriod] = useState<TimePeriod>('month')
  const [eventsBookedPeriod, setEventsBookedPeriod] = useState<TimePeriod>('month')
  const [newOpportunitiesPeriod, setNewOpportunitiesPeriod] = useState<TimePeriod>('month')

  // Modal state
  const [openModal, setOpenModal] = useState<DrilldownType | null>(null)
  const [modalPeriod, setModalPeriod] = useState<DrilldownPeriod>('month')

  // Get values based on selected periods
  const getEventsOccurringValue = (): number => {
    if (!stats) return 0
    return stats.eventsOccurring[eventsOccurringPeriod]
  }

  const getEventsBookedValue = (): { count: number; revenue: number } => {
    if (!stats) return { count: 0, revenue: 0 }
    return stats.eventsBooked[eventsBookedPeriod]
  }

  const getNewOpportunitiesValue = (): { count: number; value: number } => {
    if (!stats) return { count: 0, value: 0 }
    return stats.newOpportunities[newOpportunitiesPeriod]
  }

  const eventsBooked = getEventsBookedValue()
  const newOpportunities = getNewOpportunitiesValue()

  // Modal handlers
  const handleOpenModal = (type: DrilldownType, period: DrilldownPeriod) => {
    setOpenModal(type)
    setModalPeriod(period)
  }

  const handleCloseModal = () => {
    setOpenModal(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Card 1: Events Occurring */}
        <KPICard
          title="Events Occurring"
          icon={Calendar}
          mainValue={getEventsOccurringValue()}
          showPeriodSelector
          selectedPeriod={eventsOccurringPeriod}
          onPeriodChange={setEventsOccurringPeriod}
          isLoading={isLoading}
          onClick={() => handleOpenModal('events-occurring', eventsOccurringPeriod)}
        />

        {/* Card 2: Events Booked */}
        <KPICard
          title="Events Booked"
          icon={TrendingUp}
          mainValue={eventsBooked.count}
          secondaryLabel="Revenue"
          secondaryValue={eventsBooked.revenue}
          showPeriodSelector
          selectedPeriod={eventsBookedPeriod}
          onPeriodChange={setEventsBookedPeriod}
          isLoading={isLoading}
          onClick={() => handleOpenModal('events-booked', eventsBookedPeriod)}
        />

        {/* Card 3: Total Opportunities (no dropdown) */}
        <KPICard
          title="Total Opportunities"
          icon={Target}
          mainValue={stats?.totalOpportunities.count ?? 0}
          secondaryLabel="Pipeline Value"
          secondaryValue={stats?.totalOpportunities.pipelineValue ?? 0}
          isLoading={isLoading}
          onClick={() => handleOpenModal('total-opportunities', 'month')}
        />

        {/* Card 4: New Opportunities */}
        <KPICard
          title="New Opportunities"
          icon={DollarSign}
          mainValue={newOpportunities.count}
          secondaryLabel="Total Value"
          secondaryValue={newOpportunities.value}
          showPeriodSelector
          selectedPeriod={newOpportunitiesPeriod}
          onPeriodChange={setNewOpportunitiesPeriod}
          isLoading={isLoading}
          onClick={() => handleOpenModal('new-opportunities', newOpportunitiesPeriod)}
        />
      </div>

      {/* Drilldown Modal */}
      <KPIDrilldownModal
        isOpen={openModal !== null}
        onClose={handleCloseModal}
        type={openModal}
        period={modalPeriod}
        tenantSubdomain={tenantSubdomain}
      />
    </>
  )
}
