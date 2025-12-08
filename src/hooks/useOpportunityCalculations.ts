import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'
import type { TimePeriod } from '@/components/ui/kpi-card'

// Re-export TimePeriod for backwards compatibility
export type { TimePeriod }

const log = createLogger('hooks')

type CalculationMode = 'total' | 'expected'
type ValueMode = 'total' | 'weighted'

interface CalculationStats {
  qty: number
  amount: number
}

interface KPIMetric {
  count: number
  value: number
  weightedValue?: number
}

interface OpportunityStats {
  // Legacy fields
  total: number
  openCount: number
  totalValue: number
  expectedValue: number
  closedWonCount: number
  closedWonValue: number
  closedLostCount: number
  averageValue: number
  averageProbability: number

  // New KPI fields
  newOpps: KPIMetric
  openPipeline: KPIMetric
  won: { count: number; value: number }
  lost: { count: number; value: number }
  winRate: number | null
  avgDaysToClose: number | null
  avgDealSize: number | null
  closingSoon: KPIMetric
}

interface UseOpportunityCalculationsReturn {
  // Legacy
  calculationMode: CalculationMode
  setCalculationMode: React.Dispatch<React.SetStateAction<CalculationMode>>
  currentStats: CalculationStats
  openOpportunities: number
  loading: boolean
  fullStats: OpportunityStats | null

  // Time period
  timePeriod: TimePeriod
  setTimePeriod: React.Dispatch<React.SetStateAction<TimePeriod>>

  // Value mode (total vs weighted)
  valueMode: ValueMode
  setValueMode: React.Dispatch<React.SetStateAction<ValueMode>>

  // New KPI getters
  getNewOpps: () => { count: number; value: number }
  getOpenPipeline: () => { count: number; value: number }
  getWon: () => { count: number; value: number }
  getLost: () => { count: number; value: number }
  getWinRate: () => number | null
  getAvgDaysToClose: () => number | null
  getAvgDealSize: () => number | null
  getClosingSoon: () => { count: number; value: number }
}

/**
 * Custom hook for calculating opportunity statistics from stats API
 *
 * NOW FETCHES FROM /api/opportunities/stats with comprehensive KPI data
 * Supports 8 KPI cards: New Opps, Open Pipeline, Won, Lost, Win Rate,
 * Avg Days to Close, Avg Deal Size, Closing Soon
 *
 * @param filterStage - Stage filter to apply
 * @param filterOwner - Owner filter to apply
 * @param initialTimePeriod - Initial time period filter (default: 'month')
 * @returns Comprehensive stats and KPI getters
 */
export function useOpportunityCalculations(
  filterStage: string,
  filterOwner: string,
  initialTimePeriod: TimePeriod = 'month'
): UseOpportunityCalculationsReturn {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('total')
  const [valueMode, setValueMode] = useState<ValueMode>('total')
  const [fullStats, setFullStats] = useState<OpportunityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialTimePeriod)

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        const params = new URLSearchParams()
        if (filterStage && filterStage !== 'all') {
          params.append('stage', filterStage)
        }
        if (filterOwner && filterOwner !== 'all') {
          params.append('owner_id', filterOwner)
        }
        if (timePeriod && timePeriod !== 'all') {
          params.append('period', timePeriod)
        }

        const response = await fetch(`/api/opportunities/stats?${params.toString()}`)
        if (response.ok) {
          const data = await response.json()
          setFullStats(data)
        }
      } catch (error) {
        log.error({ error }, 'Error fetching opportunity stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [filterStage, filterOwner, timePeriod])

  // Legacy stats for backwards compatibility
  const currentStats: CalculationStats = {
    qty: calculationMode === 'total'
      ? (fullStats?.total || 0)
      : (fullStats?.openCount || 0),
    amount: calculationMode === 'total'
      ? (fullStats?.totalValue || 0)
      : (fullStats?.expectedValue || 0)
  }

  // KPI getters that respect valueMode
  const getNewOpps = () => {
    if (!fullStats?.newOpps) return { count: 0, value: 0 }
    return {
      count: fullStats.newOpps.count,
      value: valueMode === 'weighted'
        ? fullStats.newOpps.weightedValue || 0
        : fullStats.newOpps.value
    }
  }

  const getOpenPipeline = () => {
    if (!fullStats?.openPipeline) return { count: 0, value: 0 }
    return {
      count: fullStats.openPipeline.count,
      value: valueMode === 'weighted'
        ? fullStats.openPipeline.weightedValue || 0
        : fullStats.openPipeline.value
    }
  }

  const getWon = () => {
    if (!fullStats?.won) return { count: 0, value: 0 }
    return {
      count: fullStats.won.count,
      value: fullStats.won.value
    }
  }

  const getLost = () => {
    if (!fullStats?.lost) return { count: 0, value: 0 }
    return {
      count: fullStats.lost.count,
      value: fullStats.lost.value
    }
  }

  const getWinRate = () => fullStats?.winRate ?? null

  const getAvgDaysToClose = () => fullStats?.avgDaysToClose ?? null

  const getAvgDealSize = () => fullStats?.avgDealSize ?? null

  const getClosingSoon = () => {
    if (!fullStats?.closingSoon) return { count: 0, value: 0 }
    return {
      count: fullStats.closingSoon.count,
      value: valueMode === 'weighted'
        ? fullStats.closingSoon.weightedValue || 0
        : fullStats.closingSoon.value
    }
  }

  return {
    // Legacy
    calculationMode,
    setCalculationMode,
    currentStats,
    openOpportunities: fullStats?.openCount || 0,
    loading,
    fullStats,

    // Time period
    timePeriod,
    setTimePeriod,

    // Value mode
    valueMode,
    setValueMode,

    // KPI getters
    getNewOpps,
    getOpenPipeline,
    getWon,
    getLost,
    getWinRate,
    getAvgDaysToClose,
    getAvgDealSize,
    getClosingSoon
  }
}
