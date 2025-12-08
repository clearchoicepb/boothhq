'use client'

import { useParams } from 'next/navigation'
import {
  Building2,
  Users,
  TrendingUp,
  FileText,
  FileSignature,
  CheckSquare,
  MessageSquare,
  FolderKanban,
  LifeBuoy,
  Package,
  BarChart3
} from 'lucide-react'
import { usePermissions } from '@/lib/permissions'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { useSMSNotifications } from '@/lib/sms-notifications-context'
import { SidebarActionButton } from './SidebarActionButton'
import { SidebarSection } from './SidebarSection'
import { SidebarNavItem } from './SidebarNavItem'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()
  const { tenant } = useTenant()
  const { settings } = useSettings()
  const { unreadCount } = useSMSNotifications()

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col">
      {/* Logo/Tenant Name */}
      <div className="p-4 pt-6">
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

      {/* Action Buttons */}
      <div className="px-4 pb-4 space-y-2">
        <SidebarActionButton
          icon={<CheckSquare className="h-4 w-4" />}
          label="My Tasks"
          href={`/${tenantSubdomain}/dashboard/my-tasks`}
          onClick={onNavigate}
        />
        <SidebarActionButton
          icon={<MessageSquare className="h-4 w-4" />}
          label="SMS Messages"
          href={`/${tenantSubdomain}/sms`}
          badge={unreadCount}
          onClick={onNavigate}
        />
      </div>

      {/* Collapsible Sections - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {/* People Section */}
        <SidebarSection title="People" sectionKey="people" defaultExpanded>
          {permissions.leads?.view !== false && (
            <SidebarNavItem
              href={`/${tenantSubdomain}/leads`}
              icon={<TrendingUp className="h-5 w-5" />}
              label="Leads"
              onClick={onNavigate}
            />
          )}
          {permissions.contacts?.view !== false && (
            <SidebarNavItem
              href={`/${tenantSubdomain}/contacts`}
              icon={<Users className="h-5 w-5" />}
              label="Contacts"
              onClick={onNavigate}
            />
          )}
          {permissions.accounts?.view !== false && (
            <SidebarNavItem
              href={`/${tenantSubdomain}/accounts`}
              icon={<Building2 className="h-5 w-5" />}
              label="Accounts"
              onClick={onNavigate}
            />
          )}
        </SidebarSection>

        {/* Operations Section */}
        <SidebarSection title="Operations" sectionKey="operations" defaultExpanded>
          {permissions.events?.view !== false && (
            <SidebarNavItem
              href={`/${tenantSubdomain}/inventory`}
              icon={<Package className="h-5 w-5" />}
              label="Inventory"
              onClick={onNavigate}
            />
          )}
          <SidebarNavItem
            href={`/${tenantSubdomain}/reports`}
            icon={<BarChart3 className="h-5 w-5" />}
            label="Reports"
            onClick={onNavigate}
          />
        </SidebarSection>

        {/* Documents Section */}
        <SidebarSection title="Documents" sectionKey="documents" defaultExpanded>
          {permissions.invoices?.view !== false && (
            <SidebarNavItem
              href={`/${tenantSubdomain}/invoices`}
              icon={<FileText className="h-5 w-5" />}
              label="Invoices"
              onClick={onNavigate}
            />
          )}
          {permissions.contracts?.view !== false && (
            <SidebarNavItem
              href={`/${tenantSubdomain}/agreements`}
              icon={<FileSignature className="h-5 w-5" />}
              label="Agreements"
              onClick={onNavigate}
            />
          )}
        </SidebarSection>

        {/* Projects (standalone, outside sections) */}
        <div className="mt-2">
          <SidebarNavItem
            href={`/${tenantSubdomain}/projects`}
            icon={<FolderKanban className="h-5 w-5" />}
            label="Projects"
            onClick={onNavigate}
          />
        </div>
      </nav>

      {/* Bottom Pinned - Support Tickets */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <SidebarActionButton
          icon={<LifeBuoy className="h-4 w-4" />}
          label="Support Tickets"
          href={`/${tenantSubdomain}/tickets`}
          onClick={onNavigate}
        />
      </div>
    </div>
  )
}
