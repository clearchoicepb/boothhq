'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { MaintenanceDashboard } from '@/components/maintenance/maintenance-dashboard'
import { MaintenanceHistory } from '@/components/maintenance/maintenance-history'
import { Wrench, History, Calendar } from 'lucide-react'

type TabType = 'dashboard' | 'history' | 'schedule'

export default function MaintenancePage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </AppLayout>
    )
  }

  if (!session || !tenant) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Please sign in to access maintenance</div>
        </div>
      </AppLayout>
    )
  }

  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: Wrench,
      description: 'Due and overdue maintenance'
    },
    {
      id: 'history' as TabType,
      label: 'History',
      icon: History,
      description: 'Past maintenance records'
    },
    {
      id: 'schedule' as TabType,
      label: 'Schedule',
      icon: Calendar,
      description: 'Upcoming maintenance'
    }
  ]

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto pt-6 pb-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-600 mt-2">
            Track and manage equipment maintenance schedules
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 pb-4 px-1 border-b-2 transition-colors
                    ${isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs">{tab.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'dashboard' && <MaintenanceDashboard />}
          {activeTab === 'history' && <MaintenanceHistory />}
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-lg border p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Maintenance schedule view coming soon</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
