'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, Building2, Target, Calendar, FileText, CreditCard, MapPin, CalendarDays } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Accounts', href: '/accounts', icon: Building2 },
  { name: 'Opportunities', href: '/opportunities', icon: Target },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">CRM App</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      pathname === item.href
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
