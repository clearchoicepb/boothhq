'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Plus, Building2, Users, Calendar, Camera, DollarSign, TrendingUp, FileText } from 'lucide-react'
import { usePermissions } from '@/lib/permissions'

export function Sidebar() {
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const { permissions, isLoading } = usePermissions()
  
  // Don't render quick actions if permissions are still loading
  if (isLoading) {
    return (
      <div className="sidebar-responsive fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 overflow-y-auto shadow-lg">
        <div className="p-4">
          {/* Logo/Brand */}
          <div className="mb-6">
            <Link href={`/${tenantSubdomain}/dashboard`} className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#347dc4] rounded flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">ClearChoice</h1>
                  <p className="text-xs text-gray-600">Photo Booth</p>
                </div>
              </div>
            </Link>
          </div>
          
          {/* Loading state */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <div className="flex items-center p-3 rounded border border-gray-200 bg-gray-50">
                <div className="animate-pulse bg-gray-300 rounded h-4 w-4 mr-3"></div>
                <div className="animate-pulse bg-gray-300 rounded h-3 w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      label: 'New Lead',
      href: `/${tenantSubdomain}/leads/new`,
      icon: TrendingUp,
      color: 'text-[#347dc4]',
      permission: permissions.leads.create
    },
    {
      label: 'New Contact',
      href: `/${tenantSubdomain}/contacts/new`,
      icon: Users,
      color: 'text-[#347dc4]',
      permission: permissions.contacts.create
    },
    {
      label: 'New Account',
      href: `/${tenantSubdomain}/accounts/new`,
      icon: Building2,
      color: 'text-[#347dc4]',
      permission: permissions.accounts.create
    },
    {
      label: 'New Event',
      href: `/${tenantSubdomain}/events/new`,
      icon: Calendar,
      color: 'text-[#347dc4]',
      permission: permissions.events.create
    },
    {
      label: 'New Invoice',
      href: `/${tenantSubdomain}/invoices/new`,
      icon: FileText,
      color: 'text-[#347dc4]',
      permission: permissions.invoices.create
    },
    {
      label: 'Add Equipment',
      href: `/${tenantSubdomain}/inventory/new`,
      icon: Camera,
      color: 'text-[#347dc4]',
      permission: permissions.events.create // Using events permission for inventory
    }
  ]

  return (
    <div className="sidebar-responsive fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 overflow-y-auto shadow-lg">
      <div className="p-4">
        {/* Logo/Brand */}
        <div className="mb-6">
          <Link href={`/${tenantSubdomain}/dashboard`} className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#347dc4] rounded flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">ClearChoice</h1>
                <p className="text-xs text-gray-600">Photo Booth</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions
              .filter(action => action.permission === true)
              .map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center p-3 rounded border border-gray-200 hover:border-[#347dc4] hover:bg-gray-50 transition-all duration-200 group"
                    prefetch={false}
                  >
                    <Icon className={`h-4 w-4 mr-3 ${action.color} group-hover:scale-110 transition-transform duration-200`} />
                    <span className="text-xs font-medium text-gray-900 group-hover:text-[#347dc4] transition-colors duration-200">
                      {action.label}
                    </span>
                  </Link>
                )
              })}
          </div>
        </div>

      </div>
    </div>
  )
}
