import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          className
        )}
        style={{
          '--tw-ring-color': '#347dc4',
        } as React.CSSProperties}
        onFocus={(e) => {
          e.target.style.borderColor = '#347dc4'
          e.target.style.boxShadow = '0 0 0 2px rgba(52, 125, 196, 0.2)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db'
          e.target.style.boxShadow = 'none'
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Select.displayName = 'Select'

export { Select }
