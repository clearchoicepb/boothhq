import { useState, useMemo } from 'react'
import type { OpportunityWithRelations } from './useOpportunitiesData'
import { getWeightedValue } from '@/lib/opportunity-utils'

type CalculationMode = 'total' | 'expected'

interface CalculationStats {
  qty: number
  amount: number
}

interface UseOpportunityCalculationsReturn {
  calculationMode: CalculationMode
  setCalculationMode: React.Dispatch<React.SetStateAction<CalculationMode>>
  currentStats: CalculationStats
  openOpportunities: number
}

/**
 * Custom hook for calculating opportunity statistics
 * 
 * @param opportunities - Array of opportunities to calculate from
 * @param settings - Opportunity settings (for probability calculations)
 * @returns Calculation mode, statistics, and setters
 */
export function useOpportunityCalculations(
  opportunities: OpportunityWithRelations[],
  settings: any
): UseOpportunityCalculationsReturn {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('total')

  // Calculate total opportunities (value and count)
  const calculateTotalOpportunities = useMemo(() => {
    const totalQty = opportunities.length
    const totalAmount = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)
    return { qty: totalQty, amount: totalAmount }
  }, [opportunities])

  // Calculate expected value (probability-weighted)
  const calculateExpectedValue = useMemo(() => {
    const openOpps = opportunities.filter((opp: OpportunityWithRelations) => 
      !['closed_won', 'closed_lost'].includes(opp.stage)
    )

    const expectedValue = openOpps.reduce((sum, opp) => {
      return sum + getWeightedValue(opp, settings.opportunities)
    }, 0)

    return { qty: openOpps.length, amount: expectedValue }
  }, [opportunities, settings.opportunities])

  // Get current calculation based on mode
  const currentStats = useMemo(() => {
    switch (calculationMode) {
      case 'total':
        return calculateTotalOpportunities
      case 'expected':
        return calculateExpectedValue
      default:
        return calculateTotalOpportunities
    }
  }, [calculationMode, calculateTotalOpportunities, calculateExpectedValue])

  // Count of open opportunities (not closed)
  const openOpportunities = useMemo(() => {
    return opportunities.filter(opp => 
      !['closed_won', 'closed_lost'].includes(opp.stage)
    ).length
  }, [opportunities])

  return {
    calculationMode,
    setCalculationMode,
    currentStats,
    openOpportunities,
  }
}

