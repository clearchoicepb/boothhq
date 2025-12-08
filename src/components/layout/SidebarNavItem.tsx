'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarNavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
  onClick?: () => void
}

export function SidebarNavItem({
  href,
  icon,
  label,
  badge,
  onClick
}: SidebarNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        isActive
          ? 'bg-[#347dc4] text-white'
          : 'text-gray-700 hover:bg-gray-100 hover:text-[#347dc4]'
      }`}
    >
      <span className="h-5 w-5 mr-3 flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
            isActive
              ? 'bg-white text-[#347dc4]'
              : 'bg-red-500 text-white'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
