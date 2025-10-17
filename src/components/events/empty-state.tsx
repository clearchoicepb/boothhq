import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="flex justify-center mb-4">{icon}</div>}
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  )
}

