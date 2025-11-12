'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { InventoryItemsListEnterprise } from '@/components/inventory/inventory-items-list-enterprise'
import { PhysicalAddressesList } from '@/components/inventory/physical-addresses-list'
import { ProductGroupsList } from '@/components/inventory/product-groups-list'
import { AvailabilityChecker } from '@/components/inventory/availability-checker'
import { WeekendPrepDashboard } from '@/components/inventory/weekend-prep-dashboard'
import { Package, MapPin, Boxes, CalendarSearch, CalendarDays } from 'lucide-react'

type TabType = 'items' | 'addresses' | 'groups' | 'availability' | 'weekend-prep'

export default function ComprehensiveInventoryPage() {
  const { data: session, status } = useSession()
  const { tenant, loading } = useTenant()
  const [activeTab, setActiveTab] = useState<TabType>('items')

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
          <div className="text-lg text-gray-600">Please sign in to access inventory</div>
        </div>
      </AppLayout>
    )
  }

  const tabs = [
    {
      id: 'items' as TabType,
      label: 'Inventory Items',
      icon: Package,
      description: 'Individual equipment and supplies'
    },
    {
      id: 'weekend-prep' as TabType,
      label: 'Weekend Prep',
      icon: CalendarDays,
      description: 'Upcoming events and returns'
    },
    {
      id: 'availability' as TabType,
      label: 'Check Availability',
      icon: CalendarSearch,
      description: 'Check equipment for events'
    },
    {
      id: 'addresses' as TabType,
      label: 'Physical Addresses',
      icon: MapPin,
      description: 'Warehouse and office locations'
    },
    {
      id: 'groups' as TabType,
      label: 'Product Groups',
      icon: Boxes,
      description: 'Equipment bundles and kits'
    }
  ]

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive system for tracking equipment, locations, and product groups
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
          {activeTab === 'items' && <InventoryItemsListEnterprise />}
          {activeTab === 'weekend-prep' && <WeekendPrepDashboard />}
          {activeTab === 'availability' && <AvailabilityChecker />}
          {activeTab === 'addresses' && <PhysicalAddressesList />}
          {activeTab === 'groups' && <ProductGroupsList />}
        </div>
      </div>
    </AppLayout>
  )
}
