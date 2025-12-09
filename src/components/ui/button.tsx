import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const defaultStyle = variant === 'default' ? { backgroundColor: '#347dc4', color: 'white' } : {}

    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95 active:shadow-inner',
          {
            'hover:shadow-md': variant === 'default',
            'bg-red-600 text-white hover:bg-red-700 hover:shadow-md': variant === 'destructive',
            'border border-gray-300 bg-white hover:bg-gray-50 hover:shadow-md text-gray-900': variant === 'outline',
            'bg-gray-100 text-gray-900 hover:bg-gray-200 hover:shadow-md': variant === 'secondary',
            'hover:bg-gray-100 text-gray-900 hover:shadow-sm': variant === 'ghost',
            'underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-md px-3': size === 'sm',
            'h-11 rounded-md px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        style={{
          ...defaultStyle,
          ...(variant === 'link' ? { color: '#347dc4' } : {}),
        }}
        onMouseEnter={(e) => {
          if (variant === 'default') {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#2c6ba8'
          }
        }}
        onMouseLeave={(e) => {
          if (variant === 'default') {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#347dc4'
          }
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
