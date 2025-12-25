'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { StaffingTable } from '@/components/staffing/StaffingTable'
import { useStaffingCounts } from '@/hooks/useEventStaffing'
import Link from 'next/link'

export default function StaffingPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const [activeTab, setActiveTab] = useState('event_managers')

  const { data: counts, isLoading: countsLoading } = useStaffingCounts()

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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-[1600px] mx-auto px-6 py-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Event Staffing</h1>
              <p className="text-sm text-gray-600">Assign staff to upcoming events</p>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="event_managers" className="flex items-center gap-2">
                Event Managers
                {!countsLoading && counts && counts.eventManagerCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">
                    {counts.eventManagerCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="designers" className="flex items-center gap-2">
                Designers
                {!countsLoading && counts && counts.designerCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">
                    {counts.designerCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="event_staff" className="flex items-center gap-2">
                Event Staff
                {!countsLoading && counts && counts.eventStaffCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">
                    {counts.eventStaffCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="event_managers">
              <StaffingTable
                roleType="event_manager"
                daysAhead={null}
              />
            </TabsContent>

            <TabsContent value="designers">
              <StaffingTable
                roleType="designer"
                daysAhead={null}
              />
            </TabsContent>

            <TabsContent value="event_staff">
              <StaffingTable
                roleType="event_staff"
                daysAhead={90}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}
