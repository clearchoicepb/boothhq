interface PaymentStatusBadgeProps {
  status: string | null | undefined
  color?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
}

function getPaymentStatusColor(color: string | null | undefined): string {
  switch (color) {
    case 'red':
      return 'bg-red-100 text-red-800'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800'
    case 'green':
      return 'bg-green-100 text-green-800'
    case 'blue':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function PaymentStatusBadge({ status, color, size = 'md' }: PaymentStatusBadgeProps) {
  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${getPaymentStatusColor(color)}`}
    >
      {status || 'Not Set'}
    </span>
  )
}

