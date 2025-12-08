'use client'

import { useState, useEffect } from 'react'
import { opportunitiesApi } from '@/lib/db/opportunities'
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react'
import type { Opportunity } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'
import { isOpenStage } from '@/lib/constants/opportunity-stages'

const log = createLogger('components')

interface OpportunityWithRelations extends Opportunity {
  accounts: {
    id: string
    name: string
  } | null
  contacts: {
    id: string
    first_name: string
    last_name: string
  } | null
}

export function OpportunityStats() {
  const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true)
        const data = await opportunitiesApi.getAll()
        setOpportunities(data)
      } catch (error) {
        log.error({ error }, 'Error fetching opportunities')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0)
  const activeOpportunities = opportunities.filter(opp =>
    isOpenStage(opp.stage)
  ).length
  const wonOpportunities = opportunities.filter(opp => opp.stage === 'closed_won').length
  const avgProbability = opportunities.length > 0 
    ? opportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / opportunities.length
    : 0

  const stats = [
    {
      name: 'Total Pipeline Value',
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(totalValue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Active Opportunities',
      value: activeOpportunities.toString(),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Won Opportunities',
      value: wonOpportunities.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Avg Probability',
      value: `${Math.round(avgProbability)}%`,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.name} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
