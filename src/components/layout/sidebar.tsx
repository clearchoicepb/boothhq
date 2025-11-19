'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Building2, Users, TrendingUp, FileText, FileSignature, CheckSquare, MessageSquare, FolderKanban } from 'lucide-react'
import { usePermissions } from '@/lib/permissions'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const params = useParams()
  const pathname = usePathname()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()
  const { tenant } = useTenant()
  const { settings } = useSettings()

  const sidebarItems = [
    {
      label: 'My Tasks',
      href: `/${tenantSubdomain}/dashboard/my-tasks`,
      icon: CheckSquare,
      permission: true // Always visible to authenticated users
    },
    {
      label: 'Projects',
      href: `/${tenantSubdomain}/projects`,
      icon: FolderKanban,
      permission: permissions.projects?.view || true // Default to visible
    },
    {
      label: 'Leads',
      href: `/${tenantSubdomain}/leads`,
      icon: TrendingUp,
      permission: permissions.leads?.view
    },
    {
      label: 'Contacts',
      href: `/${tenantSubdomain}/contacts`,
      icon: Users,
      permission: permissions.contacts?.view
    },
    {
      label: 'Accounts',
      href: `/${tenantSubdomain}/accounts`,
      icon: Building2,
      permission: permissions.accounts?.view
    },
    {
      label: 'Invoices',
      href: `/${tenantSubdomain}/invoices`,
      icon: FileText,
      permission: permissions.invoices?.view
    },
    {
      label: 'Agreements',
      href: `/${tenantSubdomain}/agreements`,
      icon: FileSignature,
      permission: permissions.contracts?.view
    },
    {
      label: 'SMS Messages',
      href: `/${tenantSubdomain}/sms`,
      icon: MessageSquare,
      permission: true // Always visible to authenticated users
    }
  ]

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 overflow-y-auto">
      <div className="p-4 pt-6">
        {/* Tenant Name or Logo */}
        <div className="mb-8">
          {settings?.appearance?.logoUrl ? (
            <div className="flex flex-col items-start">
              <img
                src={settings.appearance.logoUrl}
                alt={tenant?.name || 'Company Logo'}
                className="h-12 w-auto object-contain mb-2"
              />
              <p className="text-sm text-gray-500">Photo Booth CRM</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900">
                {tenant?.name || 'ClearChoice'}
              </h1>
              <p className="text-sm text-gray-500">Photo Booth CRM</p>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          {sidebarItems
            .filter(item => item.permission !== false)
            .map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#347dc4] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#347dc4]'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
        </nav>
      </div>
    </div>
  )
}
