'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { LogOut, User, ChevronDown, LayoutDashboard, Users, Building2, Target, Calendar, FileText, TrendingUp, Settings, Menu, Plus } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePermissions } from '@/lib/permissions'
import { useTenant } from '@/lib/tenant-context'
import { GlobalSearch } from '@/components/global-search'
import { createLogger } from '@/lib/logger'

const log = createLogger('layout')

interface TopNavProps {
  leftContent?: React.ReactNode
}

export function TopNav({ leftContent }: TopNavProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  const { permissions } = usePermissions()
  const { tenant } = useTenant()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const quickActionsRef = useRef<HTMLDivElement>(null)

  const navigation = [
    { name: 'Dashboard', href: `/${tenantSubdomain}/dashboard`, icon: LayoutDashboard },
    { name: 'Opportunities', href: `/${tenantSubdomain}/opportunities`, icon: TrendingUp, permission: permissions.opportunities?.view },
    { name: 'Events', href: `/${tenantSubdomain}/events`, icon: Calendar, permission: permissions.events.view },
    { name: 'Projects', href: `/${tenantSubdomain}/projects`, icon: Target, permission: permissions.projects?.view },
    { name: 'Settings', href: `/${tenantSubdomain}/settings`, icon: Settings, permission: permissions.settings?.view },
  ]

  const quickActions = [
    {
      label: 'New Lead',
      href: `/${tenantSubdomain}/leads/new`,
      icon: TrendingUp,
      permission: permissions.leads?.create
    },
    {
      label: 'New Contact',
      href: `/${tenantSubdomain}/contacts/new`,
      icon: Users,
      permission: permissions.contacts?.create
    },
    {
      label: 'New Account',
      href: `/${tenantSubdomain}/accounts/new`,
      icon: Building2,
      permission: permissions.accounts?.create
    },
    {
      label: 'New Event',
      href: `/${tenantSubdomain}/events/new`,
      icon: Calendar,
      permission: permissions.events?.create
    },
    {
      label: 'New Invoice',
      href: `/${tenantSubdomain}/invoices/new`,
      icon: FileText,
      permission: permissions.invoices?.create
    }
  ]

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({ callbackUrl: '/auth/signin' })
      router.push('/auth/signin')
    } catch (error) {
      log.error({ error }, 'Sign out error')
      setIsSigningOut(false)
    }
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
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setIsQuickActionsOpen(false)
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
      <nav className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left Content (Hamburger menu for mobile) */}
          {leftContent}

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navigation.filter(item => !item.permission || item.permission).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
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
          
          {/* Quick Actions Dropdown */}
          <div className="relative flex-shrink-0" ref={quickActionsRef}>
            <button
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              onMouseEnter={() => setIsQuickActionsOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Quick Actions</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {isQuickActionsOpen && (
              <div
                className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[51]"
                onMouseLeave={() => setIsQuickActionsOpen(false)}
              >
                {quickActions
                  .filter(action => action.permission !== false)
                  .map((action) => {
                    const Icon = action.icon
                    return (
                      <Link
                        key={action.label}
                        href={action.href}
                        onClick={() => setIsQuickActionsOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#347dc4] transition-colors duration-150"
                      >
                        <Icon className="h-4 w-4 mr-3 text-[#347dc4]" />
                        <span>{action.label}</span>
                      </Link>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Global Search */}
          <div className="hidden md:flex flex-1 max-w-[400px] xl:max-w-2xl 2xl:max-w-4xl mx-1 xl:mx-2 2xl:mx-6">
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
                    disabled={isSigningOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
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