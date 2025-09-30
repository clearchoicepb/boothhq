'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { LogOut, User, ChevronDown, LayoutDashboard, Users, Building2, Target, Calendar, FileText, Camera, TrendingUp, Settings, Menu } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePermissions } from '@/lib/permissions'
import { GlobalSearch } from '@/components/global-search'

export function TopNav() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const navigation = [
    { name: 'Dashboard', href: `/${tenantSubdomain}/dashboard`, icon: LayoutDashboard },
    { name: 'Leads', href: `/${tenantSubdomain}/leads`, icon: Target, permission: permissions.leads.view },
    { name: 'Opportunities', href: `/${tenantSubdomain}/opportunities`, icon: TrendingUp, permission: permissions.opportunities?.view },
    { name: 'Contacts', href: `/${tenantSubdomain}/contacts`, icon: Users, permission: permissions.contacts.view },
    { name: 'Accounts', href: `/${tenantSubdomain}/accounts`, icon: Building2, permission: permissions.accounts.view },
    { name: 'Events', href: `/${tenantSubdomain}/events`, icon: Calendar, permission: permissions.events.view },
    { name: 'Invoices', href: `/${tenantSubdomain}/invoices`, icon: FileText, permission: permissions.invoices.view },
    { name: 'Inventory', href: `/${tenantSubdomain}/inventory`, icon: Camera, permission: permissions.events.view }, // Using events permission for inventory
    { name: 'Settings', href: `/${tenantSubdomain}/settings`, icon: Settings, permission: permissions.settings?.view },
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
    router.push('/auth/signin')
  }

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Navigation Menu */}
      <nav className="mobile-nav px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2 xl:space-x-4 2xl:space-x-6">
            {navigation.filter(item => !item.permission || item.permission).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1 xl:space-x-1.5 px-1.5 xl:px-2 2xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#347dc4] text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-[#347dc4]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                  <span className="whitespace-nowrap">{item.name}</span>
                </Link>
              )
            })}
          </div>
          
          {/* Mobile Navigation - Dropdown Menu */}
          <div className="lg:hidden relative" ref={mobileMenuRef}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-[#347dc4] transition-colors duration-150"
            >
              <Menu className="h-5 w-5" />
              <span>Menu</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* Mobile Search */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <GlobalSearch tenantSubdomain={tenantSubdomain} />
                </div>
                
                {/* Navigation Items */}
                {navigation.filter(item => !item.permission || item.permission).map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-[#347dc4] text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-[#347dc4]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Global Search */}
          <div className="hidden md:flex flex-1 max-w-[200px] xl:max-w-xs 2xl:max-w-md mx-1 xl:mx-2 2xl:mx-6">
            <GlobalSearch tenantSubdomain={tenantSubdomain} />
          </div>
          
          {session && (
            <div className="relative flex-shrink-0" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="w-8 h-8 bg-[#347dc4] rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[51]">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {session.user?.name || session.user?.email}
                    </p>
                    <p className="text-xs text-gray-500">{session.user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}