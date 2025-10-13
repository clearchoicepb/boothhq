import { Palette } from 'lucide-react'

interface ProductDesignBadgeProps {
  requiresDesign: boolean
  className?: string
}

export function ProductDesignBadge({ requiresDesign, className = '' }: ProductDesignBadgeProps) {
  if (!requiresDesign) return null

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 font-medium ${className}`}>
      <Palette className="h-3 w-3 mr-1" />
      Design Required
    </span>
  )
}
