'use client'

import Link from 'next/link'

interface SidebarActionButtonProps {
  icon: React.ReactNode
  label: string
  href: string
  badge?: number
  onClick?: () => void
}

export function SidebarActionButton({
  icon,
  label,
  href,
  badge,
  onClick
}: SidebarActionButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 bg-[#347dc4] text-white hover:bg-[#2c6ba8] hover:shadow-md active:scale-95"
    >
      <span className="h-4 w-4 mr-2 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-white text-[#347dc4]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
