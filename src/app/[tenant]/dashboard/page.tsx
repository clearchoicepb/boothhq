'use client'

import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { KPICardsSection } from '@/components/dashboard/kpi-cards'
import { WeeklyEventsTable } from '@/components/dashboard/weekly-events-table'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const params = useParams()
  const tenantSubdomain = params.tenant as string

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

  return (
    <AppLayout>
      <div className="dashboard-container w-full max-w-none">
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

        {/* KPI Cards Section */}
        <div className="mb-6 lg:mb-8">
          <KPICardsSection tenantSubdomain={tenantSubdomain} />
        </div>

        {/* This Week's Events Table */}
        <div className="mb-6 lg:mb-8">
          <WeeklyEventsTable tenantSubdomain={tenantSubdomain} />
        </div>
      </div>
    </AppLayout>
  )
}
