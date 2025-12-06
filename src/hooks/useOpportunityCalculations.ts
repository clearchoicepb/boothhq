import { useState, useEffect } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('hooks')

type CalculationMode = 'total' | 'expected'

interface CalculationStats {
  qty: number
  amount: number
}

interface OpportunityStats {
  total: number
  openCount: number
  totalValue: number
  expectedValue: number
  closedWonCount: number
  closedWonValue: number
  closedLostCount: number
  averageValue: number
  averageProbability: number
}

interface UseOpportunityCalculationsReturn {
  calculationMode: CalculationMode
  setCalculationMode: React.Dispatch<React.SetStateAction<CalculationMode>>
  currentStats: CalculationStats
  openOpportunities: number
  loading: boolean
  fullStats: OpportunityStats | null
}

/**
 * Custom hook for calculating opportunity statistics from stats API
 * 
 * NOW FETCHES FROM /api/opportunities/stats (ALL opportunities)
 * Instead of calculating from current page data only
 * 
 * @param filterStage - Stage filter to apply
 * @param filterOwner - Owner filter to apply
 * @returns Calculation mode, statistics from ALL opportunities, and setters
 */
export function useOpportunityCalculations(
  filterStage: string,
  filterOwner: string
): UseOpportunityCalculationsReturn {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('total')
  const [fullStats, setFullStats] = useState<OpportunityStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch stats from API (all opportunities, not just current page)
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
  }, [filterStage, filterOwner])

  // Format stats for display based on calculation mode
  const currentStats: CalculationStats = {
    qty: calculationMode === 'total' 
      ? (fullStats?.total || 0)
      : (fullStats?.openCount || 0),
    amount: calculationMode === 'total'
      ? (fullStats?.totalValue || 0)
      : (fullStats?.expectedValue || 0)
  }

  return {
    calculationMode,
    setCalculationMode,
    currentStats,
    openOpportunities: fullStats?.openCount || 0,
    loading,
    fullStats
  }
}

