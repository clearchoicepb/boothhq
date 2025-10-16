'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, Building2, Target, Calendar, DollarSign, Clock } from 'lucide-react'

interface DashboardStats {
  totalLeads: number
  totalOpportunities: number
  totalEvents: number
  totalAccounts: number
  totalContacts: number
  totalRevenue: number
  conversionRate: number
  averageDealSize: number
  leadsThisMonth: number
  opportunitiesThisMonth: number
  eventsThisMonth: number
  revenueThisMonth: number
  leadsGrowth: number
  opportunitiesGrowth: number
  eventsGrowth: number
  revenueGrowth: number
}

interface DashboardStatsProps {
  className?: string
}

export function DashboardStats({ className = '' }: DashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data in parallel
      const [leadsResponse, opportunitiesResponse, eventsResponse, accountsResponse, contactsResponse] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/opportunities?stage=all&include_converted=true'),
        fetch('/api/events?status=all&type=all'),
        fetch('/api/accounts?filterType=all'),
        fetch('/api/contacts')
      ])

      const [leads, opportunities, events, accounts, contacts] = await Promise.all([
        leadsResponse.ok ? leadsResponse.json() : [],
        opportunitiesResponse.ok ? opportunitiesResponse.json() : [],
        eventsResponse.ok ? eventsResponse.json() : [],
        accountsResponse.ok ? accountsResponse.json() : [],
        contactsResponse.ok ? contactsResponse.json() : []
      ])

      // Calculate stats
      const totalRevenue = opportunities
        .filter((opp: any) => opp.stage === 'closed_won')
        .reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)

      const closedWonOpportunities = opportunities.filter((opp: any) => opp.stage === 'closed_won')
      const conversionRate = opportunities.length > 0 ? (closedWonOpportunities.length / opportunities.length) * 100 : 0
      const averageDealSize = closedWonOpportunities.length > 0 ? totalRevenue / closedWonOpportunities.length : 0

      // Calculate this month's data
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()

      const leadsThisMonth = leads.filter((lead: any) => {
        const leadDate = new Date(lead.created_at)
        return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear
      }).length

      const opportunitiesThisMonth = opportunities.filter((opp: any) => {
        const oppDate = new Date(opp.created_at)
        return oppDate.getMonth() === currentMonth && oppDate.getFullYear() === currentYear
      }).length

      const eventsThisMonth = events.filter((event: any) => {
        const eventDate = new Date(event.created_at)
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear
      }).length

      const revenueThisMonth = opportunities
        .filter((opp: any) => {
          const oppDate = new Date(opp.created_at)
          return opp.stage === 'closed_won' && 
                 oppDate.getMonth() === currentMonth && 
                 oppDate.getFullYear() === currentYear
        })
        .reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)

      // Calculate growth (simplified - comparing to previous month)
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

      const leadsPreviousMonth = leads.filter((lead: any) => {
        const leadDate = new Date(lead.created_at)
        return leadDate.getMonth() === previousMonth && leadDate.getFullYear() === previousYear
      }).length

      const opportunitiesPreviousMonth = opportunities.filter((opp: any) => {
        const oppDate = new Date(opp.created_at)
        return oppDate.getMonth() === previousMonth && oppDate.getFullYear() === previousYear
      }).length

      const eventsPreviousMonth = events.filter((event: any) => {
        const eventDate = new Date(event.created_at)
        return eventDate.getMonth() === previousMonth && eventDate.getFullYear() === previousYear
      }).length

      const revenuePreviousMonth = opportunities
        .filter((opp: any) => {
          const oppDate = new Date(opp.created_at)
          return opp.stage === 'closed_won' && 
                 oppDate.getMonth() === previousMonth && 
                 oppDate.getFullYear() === previousYear
        })
        .reduce((sum: number, opp: any) => sum + (opp.amount || 0), 0)

      const leadsGrowth = leadsPreviousMonth > 0 ? ((leadsThisMonth - leadsPreviousMonth) / leadsPreviousMonth) * 100 : 0
      const opportunitiesGrowth = opportunitiesPreviousMonth > 0 ? ((opportunitiesThisMonth - opportunitiesPreviousMonth) / opportunitiesPreviousMonth) * 100 : 0
      const eventsGrowth = eventsPreviousMonth > 0 ? ((eventsThisMonth - eventsPreviousMonth) / eventsPreviousMonth) * 100 : 0
      const revenueGrowth = revenuePreviousMonth > 0 ? ((revenueThisMonth - revenuePreviousMonth) / revenuePreviousMonth) * 100 : 0

      setStats({
        totalLeads: leads.length,
        totalOpportunities: opportunities.length,
        totalEvents: events.length,
        totalAccounts: accounts.length,
        totalContacts: contacts.length,
        totalRevenue,
        conversionRate,
        averageDealSize,
        leadsThisMonth,
        opportunitiesThisMonth,
        eventsThisMonth,
        revenueThisMonth,
        leadsGrowth,
        opportunitiesGrowth,
        eventsGrowth,
        revenueGrowth
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Unable to load dashboard statistics</p>
      </div>
    )
  }

  const StatCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon, 
    format = 'number' 
  }: { 
    title: string
    value: number
    growth: number
    icon: any
    format?: 'number' | 'currency' | 'percentage'
  }) => {
    const formatValue = (val: number) => {
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
        case 'percentage':
          return `${val.toFixed(1)}%`
        default:
          return val.toLocaleString()
      }
    }

    const isPositive = growth >= 0
    const GrowthIcon = isPositive ? TrendingUp : TrendingDown

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <GrowthIcon className={`h-4 w-4 mr-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(growth).toFixed(1)}% from last month
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <StatCard
        title="Total Leads"
        value={stats.totalLeads}
        growth={stats.leadsGrowth}
        icon={Users}
      />
      <StatCard
        title="Total Opportunities"
        value={stats.totalOpportunities}
        growth={stats.opportunitiesGrowth}
        icon={Target}
      />
      <StatCard
        title="Total Events"
        value={stats.totalEvents}
        growth={stats.eventsGrowth}
        icon={Calendar}
      />
      <StatCard
        title="Total Revenue"
        value={stats.totalRevenue}
        growth={stats.revenueGrowth}
        icon={DollarSign}
        format="currency"
      />
      <StatCard
        title="Total Accounts"
        value={stats.totalAccounts}
        growth={0}
        icon={Building2}
      />
      <StatCard
        title="Total Contacts"
        value={stats.totalContacts}
        growth={0}
        icon={Users}
      />
      <StatCard
        title="Conversion Rate"
        value={stats.conversionRate}
        growth={0}
        icon={TrendingUp}
        format="percentage"
      />
      <StatCard
        title="Average Deal Size"
        value={stats.averageDealSize}
        growth={0}
        icon={DollarSign}
        format="currency"
      />
    </div>
  )
}















