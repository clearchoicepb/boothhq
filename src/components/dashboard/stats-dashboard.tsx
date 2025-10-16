'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { 
  Users, 
  UserPlus, 
  Target, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react'

interface StatsData {
  leads: {
    total: number
    new: number
    contacted: number
    qualified: number
    converted: number
    conversionRate: number
  }
  contacts: {
    total: number
    active: number
    linkedToAccounts: number
    recentActivity: number
  }
  accounts: {
    total: number
    individual: number
    company: number
    totalRevenue: number
    totalEvents: number
  }
  opportunities: {
    total: number
    open: number
    closedWon: number
    closedLost: number
    totalValue: number
    expectedValue: number
    winRate: number
  }
  trends: {
    leadsThisMonth: number
    leadsLastMonth: number
    opportunitiesThisMonth: number
    opportunitiesLastMonth: number
    revenueThisMonth: number
    revenueLastMonth: number
  }
}

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ComponentType<any>
  color: string
  subtitle?: string
}

function StatCard({ title, value, change, changeLabel, icon: Icon, color, subtitle }: StatCardProps) {
  const isPositive = change !== undefined ? change >= 0 : true
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              {change !== undefined && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                  ) : (
                    <TrendingDown className="self-center flex-shrink-0 h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isPositive ? 'Increased' : 'Decreased'} by
                  </span>
                  {Math.abs(change)}%
                  {changeLabel && (
                    <span className="ml-1 text-gray-500">{changeLabel}</span>
                  )}
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="text-sm text-gray-500 mt-1">
                {subtitle}
              </dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

export function StatsDashboard() {
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && tenant) {
      fetchStats()
    }
  }, [session, tenant])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const [leadsResponse, contactsResponse, accountsResponse, opportunitiesResponse] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/contacts'),
        fetch('/api/accounts'),
        fetch('/api/opportunities?include_converted=true')
      ])

      if (!leadsResponse.ok || !contactsResponse.ok || !accountsResponse.ok || !opportunitiesResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [leadsData, contactsData, accountsData, opportunitiesData] = await Promise.all([
        leadsResponse.json(),
        contactsResponse.json(),
        accountsResponse.json(),
        opportunitiesResponse.json()
      ])

      // Calculate statistics
      const leads = leadsData || []
      const contacts = contactsData || []
      const accounts = accountsData.accounts || accountsData || []
      const opportunities = opportunitiesData || []

      // Lead statistics
      const leadStats = {
        total: leads.length,
        new: leads.filter((l: any) => l.status === 'new').length,
        contacted: leads.filter((l: any) => l.status === 'contacted').length,
        qualified: leads.filter((l: any) => l.status === 'qualified').length,
        converted: leads.filter((l: any) => l.status === 'converted').length,
        conversionRate: leads.length > 0 ? (leads.filter((l: any) => l.status === 'converted').length / leads.length) * 100 : 0
      }

      // Contact statistics
      const contactStats = {
        total: contacts.length,
        active: contacts.filter((c: any) => c.status === 'active').length,
        linkedToAccounts: contacts.filter((c: any) => c.account_id).length,
        recentActivity: contacts.filter((c: any) => {
          const createdDate = new Date(c.created_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return createdDate >= thirtyDaysAgo
        }).length
      }

      // Account statistics
      const accountStats = {
        total: accounts.length,
        individual: accounts.filter((a: any) => a.account_type === 'individual').length,
        company: accounts.filter((a: any) => a.account_type === 'company').length,
        totalRevenue: 0, // Will be calculated from events/invoices
        totalEvents: 0 // Will be calculated from events
      }

      // Opportunity statistics
      const opportunityStats = {
        total: opportunities.length,
        open: opportunities.filter((o: any) => !['closed_won', 'closed_lost'].includes(o.stage)).length,
        closedWon: opportunities.filter((o: any) => o.stage === 'closed_won').length,
        closedLost: opportunities.filter((o: any) => o.stage === 'closed_lost').length,
        totalValue: opportunities.reduce((sum: number, o: any) => sum + (o.amount || 0), 0),
        expectedValue: 0, // Will be calculated with probability
        winRate: opportunities.filter((o: any) => ['closed_won', 'closed_lost'].includes(o.stage)).length > 0 
          ? (opportunities.filter((o: any) => o.stage === 'closed_won').length / 
             opportunities.filter((o: any) => ['closed_won', 'closed_lost'].includes(o.stage)).length) * 100 
          : 0
      }

      // Calculate expected value based on probability
      const openOpportunities = opportunities.filter((o: any) => !['closed_won', 'closed_lost'].includes(o.stage))
      opportunityStats.expectedValue = openOpportunities.reduce((sum: number, o: any) => {
        const amount = o.amount || 0
        const probability = o.probability || 0
        return sum + (amount * probability / 100)
      }, 0)

      // Calculate trends (simplified - comparing current month to last month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const trends = {
        leadsThisMonth: leads.filter((l: any) => {
          const createdDate = new Date(l.created_at)
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
        }).length,
        leadsLastMonth: leads.filter((l: any) => {
          const createdDate = new Date(l.created_at)
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
          return createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear
        }).length,
        opportunitiesThisMonth: opportunities.filter((o: any) => {
          const createdDate = new Date(o.created_at)
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
        }).length,
        opportunitiesLastMonth: opportunities.filter((o: any) => {
          const createdDate = new Date(o.created_at)
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
          return createdDate.getMonth() === lastMonth && createdDate.getFullYear() === lastMonthYear
        }).length,
        revenueThisMonth: 0, // Will be calculated from closed won opportunities
        revenueLastMonth: 0 // Will be calculated from closed won opportunities
      }

      // Calculate revenue trends
      trends.revenueThisMonth = opportunities
        .filter((o: any) => o.stage === 'closed_won' && 
          new Date(o.actual_close_date || o.created_at).getMonth() === currentMonth &&
          new Date(o.actual_close_date || o.created_at).getFullYear() === currentYear)
        .reduce((sum: number, o: any) => sum + (o.amount || 0), 0)

      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
      trends.revenueLastMonth = opportunities
        .filter((o: any) => o.stage === 'closed_won' && 
          new Date(o.actual_close_date || o.created_at).getMonth() === lastMonth &&
          new Date(o.actual_close_date || o.created_at).getFullYear() === lastMonthYear)
        .reduce((sum: number, o: any) => sum + (o.amount || 0), 0)

      setStats({
        leads: leadStats,
        contacts: contactStats,
        accounts: accountStats,
        opportunities: opportunityStats,
        trends
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-gray-200">
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Activity className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading statistics
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const leadsGrowth = stats.trends.leadsLastMonth > 0 
    ? ((stats.trends.leadsThisMonth - stats.trends.leadsLastMonth) / stats.trends.leadsLastMonth) * 100 
    : 0

  const opportunitiesGrowth = stats.trends.opportunitiesLastMonth > 0 
    ? ((stats.trends.opportunitiesThisMonth - stats.trends.opportunitiesLastMonth) / stats.trends.opportunitiesLastMonth) * 100 
    : 0

  const revenueGrowth = stats.trends.revenueLastMonth > 0 
    ? ((stats.trends.revenueThisMonth - stats.trends.revenueLastMonth) / stats.trends.revenueLastMonth) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Leads"
          value={stats.leads.total}
          change={leadsGrowth}
          changeLabel="vs last month"
          icon={UserPlus}
          color="bg-blue-500"
          subtitle={`${stats.leads.converted} converted`}
        />
        <StatCard
          title="Active Contacts"
          value={stats.contacts.active}
          change={undefined}
          icon={Users}
          color="bg-green-500"
          subtitle={`${stats.contacts.total} total contacts`}
        />
        <StatCard
          title="Open Opportunities"
          value={stats.opportunities.open}
          change={opportunitiesGrowth}
          changeLabel="vs last month"
          icon={Target}
          color="bg-purple-500"
          subtitle={`$${stats.opportunities.totalValue.toLocaleString()} total value`}
        />
        <StatCard
          title="Total Accounts"
          value={stats.accounts.total}
          change={undefined}
          icon={Building2}
          color="bg-orange-500"
          subtitle={`${stats.accounts.company} companies, ${stats.accounts.individual} individuals`}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Lead Conversion Rate"
          value={`${stats.leads.conversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          color="bg-blue-600"
          subtitle={`${stats.leads.converted} of ${stats.leads.total} leads`}
        />
        <StatCard
          title="Opportunity Win Rate"
          value={`${stats.opportunities.winRate.toFixed(1)}%`}
          icon={Target}
          color="bg-green-600"
          subtitle={`${stats.opportunities.closedWon} won, ${stats.opportunities.closedLost} lost`}
        />
        <StatCard
          title="Expected Revenue"
          value={`$${stats.opportunities.expectedValue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-600"
          subtitle="Based on probability-weighted opportunities"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.trends.revenueThisMonth.toLocaleString()}`}
          change={revenueGrowth}
          changeLabel="vs last month"
          icon={Calendar}
          color="bg-orange-600"
          subtitle="From closed won opportunities"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <UserPlus className="h-8 w-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Lead</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="h-8 w-8 text-green-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Contact</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Target className="h-8 w-8 text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Opportunity</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Building2 className="h-8 w-8 text-orange-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Add Account</span>
          </button>
        </div>
      </div>
    </div>
  )
}


















