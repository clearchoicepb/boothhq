'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createLogger } from '@/lib/logger'

const log = createLogger('reports')
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  Award,
  Calendar,
  ChevronDown
} from 'lucide-react'

type DateRange = '7d' | '30d' | '90d' | '180d' | '365d' | 'all'

interface KPIData {
  totalPipeline: number
  weightedPipeline: number
  winRate: number
  avgDealSize: number
}

interface StageData {
  stage: string
  count: number
  value: number
}

interface OwnerPerformance {
  owner_name: string
  deals_won: number
  total_revenue: number
}

interface RecentWin {
  id: string
  name: string
  account_name: string
  amount: number
  close_date: string
}

export default function ReportsPage() {
  const { tenant: tenantSubdomain } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'sales')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [loading, setLoading] = useState(true)
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  // Sales Dashboard Data
  const [kpiData, setKpiData] = useState<KPIData>({
    totalPipeline: 0,
    weightedPipeline: 0,
    winRate: 0,
    avgDealSize: 0
  })
  const [stageData, setStageData] = useState<StageData[]>([])
  const [ownerPerformance, setOwnerPerformance] = useState<OwnerPerformance[]>([])
  const [recentWins, setRecentWins] = useState<RecentWin[]>([])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesData()
    }
  }, [activeTab, dateRange])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/${tenantSubdomain}/reports?tab=${tab}`)
  }

  const getDateRangeFilter = () => {
    const now = new Date()
    let startDate: Date | null = null

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '180d':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '365d':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        startDate = null
        break
    }

    return startDate
  }

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      const startDate = getDateRangeFilter()
      const dateFilter = startDate ? `&created_at=gte.${startDate.toISOString()}` : ''

      // Fetch all opportunities
      const response = await fetch(`/api/opportunities?limit=1000${dateFilter}`)
      if (!response.ok) throw new Error('Failed to fetch opportunities')

      const opportunities = await response.json()

      // Calculate KPIs
      const openOpps = opportunities.filter((o: any) =>
        o.stage !== 'closed_won' && o.stage !== 'closed_lost'
      )
      const closedOpps = opportunities.filter((o: any) =>
        o.stage === 'closed_won' || o.stage === 'closed_lost'
      )
      const wonOpps = opportunities.filter((o: any) => o.stage === 'closed_won')

      const totalPipeline = openOpps.reduce((sum: number, o: any) => sum + (o.amount || 0), 0)
      const weightedPipeline = openOpps.reduce((sum: number, o: any) =>
        sum + ((o.amount || 0) * (o.probability || 0) / 100), 0
      )
      const winRate = closedOpps.length > 0
        ? Math.round((wonOpps.length / closedOpps.length) * 100)
        : 0
      const avgDealSize = wonOpps.length > 0
        ? Math.round(wonOpps.reduce((sum: number, o: any) => sum + (o.amount || 0), 0) / wonOpps.length)
        : 0

      setKpiData({
        totalPipeline,
        weightedPipeline: Math.round(weightedPipeline),
        winRate,
        avgDealSize
      })

      // Calculate stage breakdown
      const stageMap = new Map<string, { count: number; value: number }>()
      openOpps.forEach((opp: any) => {
        const stage = opp.stage || 'unknown'
        const existing = stageMap.get(stage) || { count: 0, value: 0 }
        stageMap.set(stage, {
          count: existing.count + 1,
          value: existing.value + (opp.amount || 0)
        })
      })

      const stageBreakdown = Array.from(stageMap.entries())
        .map(([stage, data]) => ({
          stage: stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          count: data.count,
          value: data.value
        }))
        .sort((a, b) => b.value - a.value)

      setStageData(stageBreakdown)

      // Fetch accounts for owner names
      const accountIds = [...new Set(opportunities.map((o: any) => o.account_id).filter(Boolean))]
      const accountsResponse = await fetch(`/api/accounts?id=in.(${accountIds.join(',')})&limit=1000`)
      const accounts = accountsResponse.ok ? await accountsResponse.json() : []

      // Fetch users for owner names
      const userIds = [...new Set(accounts.map((a: any) => a.assigned_to).filter(Boolean))]
      const usersResponse = await fetch(`/api/users?id=in.(${userIds.join(',')})`)
      const users = usersResponse.ok ? await usersResponse.json() : []

      const userMap = new Map<string, string>(users.map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]))
      const accountOwnerMap = new Map<string, string>(accounts.map((a: any) => [a.id, a.assigned_to]))

      // Calculate owner performance
      const ownerMap = new Map<string, { deals_won: number; total_revenue: number }>()

      wonOpps.forEach((opp: any) => {
        const ownerId = accountOwnerMap.get(opp.account_id)
        if (!ownerId) return

        const ownerName = userMap.get(ownerId) || 'Unknown'
        const existing = ownerMap.get(ownerName) || { deals_won: 0, total_revenue: 0 }
        ownerMap.set(ownerName, {
          deals_won: existing.deals_won + 1,
          total_revenue: existing.total_revenue + (opp.amount || 0)
        })
      })

      const leaderboard = Array.from(ownerMap.entries())
        .map(([owner_name, data]) => ({
          owner_name,
          deals_won: data.deals_won,
          total_revenue: data.total_revenue
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5)

      setOwnerPerformance(leaderboard)

      // Recent wins
      const accountMap = new Map(accounts.map((a: any) => [a.id, a.name]))
      const wins = wonOpps
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map((opp: any) => ({
          id: opp.id,
          name: opp.name,
          account_name: accountMap.get(opp.account_id) || 'Unknown',
          amount: opp.amount || 0,
          close_date: opp.expected_close_date || opp.created_at
        }))

      setRecentWins(wins)

    } catch (error) {
      log.error({ error }, 'Error fetching sales data')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '180d', label: 'Last 180 days' },
    { value: '365d', label: 'Last 365 days' },
    { value: 'all', label: 'All time' },
  ]

  const getCurrentDateLabel = () => {
    return dateRangeOptions.find(opt => opt.value === dateRange)?.label || 'Last 30 days'
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-3 text-[#347dc4]" />
                  Reports & Analytics
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Track performance and gain insights across your organization
                </p>
              </div>

            {activeTab === 'sales' && (
              <div className="relative">
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {getCurrentDateLabel()}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>

                {showDateDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      {dateRangeOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setDateRange(option.value)
                            setShowDateDropdown(false)
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            dateRange === option.value
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => handleTabChange('sales')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sales
            </button>
            <button
              onClick={() => handleTabChange('operations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'operations'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Operations
            </button>
            <button
              onClick={() => handleTabChange('financials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'financials'
                  ? 'border-[#347dc4] text-[#347dc4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Financials
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'sales' && (
          <div className="space-y-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#347dc4]"></div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Pipeline</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-2">
                          {formatCurrency(kpiData.totalPipeline)}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Target className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Weighted Pipeline</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-2">
                          {formatCurrency(kpiData.weightedPipeline)}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Win Rate</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-2">
                          {kpiData.winRate}%
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Award className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                        <p className="text-2xl font-semibold text-gray-900 mt-2">
                          {formatCurrency(kpiData.avgDealSize)}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sales Funnel */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Funnel</h3>
                    <div className="space-y-3">
                      {stageData.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No pipeline data</p>
                      ) : (
                        stageData.map((stage) => {
                          const maxValue = Math.max(...stageData.map(s => s.value))
                          const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0

                          return (
                            <div key={stage.stage}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                                <span className="text-sm text-gray-600">{formatCurrency(stage.value)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-[#347dc4] h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{stage.count} opportunities</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Stage Breakdown */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Breakdown</h3>
                    <div className="space-y-3">
                      {stageData.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No pipeline data</p>
                      ) : (
                        stageData.map((stage) => {
                          const totalValue = stageData.reduce((sum, s) => sum + s.value, 0)
                          const percentage = totalValue > 0 ? Math.round((stage.value / totalValue) * 100) : 0

                          return (
                            <div key={stage.stage} className="flex items-center justify-between py-2 border-b border-gray-100">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{stage.stage}</p>
                                <p className="text-xs text-gray-500">{stage.count} deals</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{percentage}%</p>
                                <p className="text-xs text-gray-600">{formatCurrency(stage.value)}</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Owner Leaderboard */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deals Won
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ownerPerformance.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                              No performance data available
                            </td>
                          </tr>
                        ) : (
                          ownerPerformance.map((owner, index) => (
                            <tr key={owner.owner_name} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-sm font-semibold ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-50 text-gray-600'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{owner.owner_name}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{owner.deals_won}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(owner.total_revenue)}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Wins */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Wins</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Opportunity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Close Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentWins.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                              No wins yet
                            </td>
                          </tr>
                        ) : (
                          recentWins.map((win) => (
                            <tr key={win.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="text-sm font-medium text-gray-900">{win.name}</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-900">{win.account_name}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-green-600">
                                  {formatCurrency(win.amount)}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-600">{formatDate(win.close_date)}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Operations Reports Coming Soon</h3>
            <p className="text-sm text-gray-500">
              Track event performance, resource utilization, and operational metrics
            </p>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Reports Coming Soon</h3>
            <p className="text-sm text-gray-500">
              Analyze revenue, invoices, quotes, and financial performance
            </p>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  )
}
