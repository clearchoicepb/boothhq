'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Building2, Users, Calendar, DollarSign, Camera, TrendingUp, Plus, CalendarDays } from 'lucide-react'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardStats } from '@/components/dashboard-stats'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  
  const [stats, setStats] = useState({
    totalAccounts: 0,
    totalContacts: 0,
    upcomingEvents: 0,
    totalRevenue: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (session && tenant) {
      fetchDashboardStats()
      fetchEvents()
    }
  }, [session, tenant])

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true)
      const [accountsRes, contactsRes, eventsRes, invoicesRes] = await Promise.all([
        fetch('/api/accounts?filterType=all'),
        fetch('/api/contacts'),
        fetch('/api/events?status=all&type=all'),
        fetch('/api/invoices?status=all')
      ])

      const [accounts, contacts, events, invoices] = await Promise.all([
        accountsRes.json(),
        contactsRes.json(),
        eventsRes.json(),
        invoicesRes.json()
      ])

      const today = new Date().toISOString().split('T')[0]
      const todayEvents = Array.isArray(events) ? events.filter((event: any) => event.event_date === today) : []

      setStats({
        totalAccounts: Array.isArray(accounts) ? accounts.length : 0,
        totalContacts: Array.isArray(contacts) ? contacts.length : 0,
        upcomingEvents: todayEvents.length,
        totalRevenue: Array.isArray(invoices) ? invoices.reduce((sum: number, invoice: any) => sum + (invoice.total_amount || 0), 0) : 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events?status=all&type=all')
      if (response.ok) {
        const data = await response.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#347dc4] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please sign in to access this page.</p>
          <Link href="/auth/signin" className="mt-4 inline-block bg-[#347dc4] text-white px-4 py-2 rounded-md hover:bg-[#2c6ba8]">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const todayEvents = Array.isArray(events) ? events.filter((event: any) => event.event_date === today) : []

  return (
    <AppLayout>
      <div className="w-full max-w-none">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg lg:text-xl font-semibold text-gray-900">
                {session?.user?.name || session?.user?.email}
              </h1>
              <p className="text-sm text-gray-600">
                {tenant?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Comprehensive Statistics Dashboard */}
        <div className="mb-6 lg:mb-8">
          <DashboardStats />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Manage your sales pipeline</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/leads`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Leads
              </Link>
              <Link href={`/${tenantSubdomain}/leads/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → New Lead
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <Users className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Manage customer contacts</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/contacts`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Contacts
              </Link>
              <Link href={`/${tenantSubdomain}/contacts/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → New Contact
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Manage customer accounts</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/accounts`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Accounts
              </Link>
              <Link href={`/${tenantSubdomain}/accounts/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → New Account
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Track sales opportunities</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/opportunities`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Opportunities
              </Link>
              <Link href={`/${tenantSubdomain}/opportunities/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → New Opportunity
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Manage your events</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/events`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Events
              </Link>
              <Link href={`/${tenantSubdomain}/events/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → New Event
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <Camera className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Manage equipment inventory</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/inventory`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Equipment
              </Link>
              <Link href={`/${tenantSubdomain}/inventory/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → Add Equipment
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
            <div className="flex items-center mb-3 lg:mb-4">
              <DollarSign className="h-4 w-4 lg:h-5 lg:w-5 text-[#347dc4]" />
            </div>
            <p className="text-xs text-gray-600 mb-3">Create and manage customer invoices</p>
            <div className="space-y-1">
              <Link href={`/${tenantSubdomain}/invoices`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → All Invoices
              </Link>
              <Link href={`/${tenantSubdomain}/invoices/new`} className="block text-xs text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
                → New Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <h2 className="text-base lg:text-lg font-medium text-gray-900">Today's Events</h2>
            <Link href={`/${tenantSubdomain}/calendar`} className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] cursor-pointer transition-colors duration-150">
              <CalendarDays className="h-5 w-5 lg:h-6 lg:w-6 text-[#347dc4]" />
            </Link>
          </div>
          <CalendarComponent events={todayEvents} />
        </div>
      </div>
    </AppLayout>
  )
}