'use client'

import { useState } from 'react'
import { Calendar, DollarSign, Target, TrendingUp } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { KPIDrilldownModal } from './kpi-drilldown-modal'
import { KPICard, KPICardGrid, periodOptions, type TimePeriodWithoutAll } from '@/components/ui/kpi-card'
import type { DrilldownType, DrilldownPeriod } from '@/hooks/useDashboardDrilldown'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

interface KPICardsSectionProps {
  tenantSubdomain: string
}

export function KPICardsSection({ tenantSubdomain }: KPICardsSectionProps) {
  const { data: stats, isLoading } = useDashboardStats()

  // Individual period states for each card that has a dropdown
  const [eventsOccurringPeriod, setEventsOccurringPeriod] = useState<TimePeriodWithoutAll>('month')
  const [eventsBookedPeriod, setEventsBookedPeriod] = useState<TimePeriodWithoutAll>('month')
  const [newOpportunitiesPeriod, setNewOpportunitiesPeriod] = useState<TimePeriodWithoutAll>('month')

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
      <KPICardGrid columns={4}>
        {/* Card 1: Events Occurring */}
        <KPICard
          label="Events Occurring"
          icon={<Calendar className="h-5 w-5" />}
          value={getEventsOccurringValue()}
          loading={isLoading}
          onClick={() => handleOpenModal('events-occurring', eventsOccurringPeriod)}
          dropdown={{
            value: eventsOccurringPeriod,
            options: periodOptions,
            onChange: (value) => setEventsOccurringPeriod(value as TimePeriodWithoutAll)
          }}
        />

        {/* Card 2: Events Booked */}
        <KPICard
          label="Events Booked"
          icon={<TrendingUp className="h-5 w-5" />}
          value={eventsBooked.count}
          secondaryLabel="Revenue"
          secondaryValue={formatCurrency(eventsBooked.revenue)}
          loading={isLoading}
          onClick={() => handleOpenModal('events-booked', eventsBookedPeriod)}
          dropdown={{
            value: eventsBookedPeriod,
            options: periodOptions,
            onChange: (value) => setEventsBookedPeriod(value as TimePeriodWithoutAll)
          }}
        />

        {/* Card 3: Total Opportunities (no dropdown) */}
        <KPICard
          label="Total Opportunities"
          icon={<Target className="h-5 w-5" />}
          value={stats?.totalOpportunities.count ?? 0}
          secondaryLabel="Pipeline Value"
          secondaryValue={formatCurrency(stats?.totalOpportunities.pipelineValue ?? 0)}
          loading={isLoading}
          onClick={() => handleOpenModal('total-opportunities', 'month')}
        />

        {/* Card 4: New Opportunities */}
        <KPICard
          label="New Opportunities"
          icon={<DollarSign className="h-5 w-5" />}
          value={newOpportunities.count}
          secondaryLabel="Total Value"
          secondaryValue={formatCurrency(newOpportunities.value)}
          loading={isLoading}
          onClick={() => handleOpenModal('new-opportunities', newOpportunitiesPeriod)}
          dropdown={{
            value: newOpportunitiesPeriod,
            options: periodOptions,
            onChange: (value) => setNewOpportunitiesPeriod(value as TimePeriodWithoutAll)
          }}
        />
      </KPICardGrid>

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
