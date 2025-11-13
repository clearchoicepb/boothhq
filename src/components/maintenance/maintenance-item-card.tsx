'use client'

import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Package, User, AlertCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface MaintenanceItemCardProps {
  item: any
  status: 'overdue' | 'due' | 'upcoming'
  onComplete: (item: any) => void
}

export function MaintenanceItemCard({ item, status, onComplete }: MaintenanceItemCardProps) {
  const daysUntilDue = item.next_maintenance_date
    ? differenceInDays(new Date(item.next_maintenance_date), new Date())
    : null

  const statusConfig = {
    overdue: {
      badge: 'bg-red-100 text-red-800 border-red-200',
      border: 'border-red-200',
      label: 'Overdue',
      buttonVariant: 'default' as const
    },
    due: {
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      border: 'border-yellow-200',
      label: 'Due Soon',
      buttonVariant: 'default' as const
    },
    upcoming: {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      border: 'border-blue-200',
      label: 'Upcoming',
      buttonVariant: 'outline' as const
    }
  }

  const config = statusConfig[status]

  return (
    <div className={`bg-white rounded-lg border-2 ${config.border} p-4 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <h3 className="font-semibold text-gray-900 truncate">{item.item_name}</h3>
          </div>
          {item.model && (
            <p className="text-sm text-gray-600">{item.model}</p>
          )}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {/* Category */}
        {item.item_category && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Category:</span>
            <span className="text-gray-900 font-medium">{item.item_category}</span>
          </div>
        )}

        {/* Last Maintenance */}
        {item.last_maintenance_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Last:</span>
            <span className="text-gray-900">
              {format(new Date(item.last_maintenance_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}

        {/* Next Maintenance */}
        {item.next_maintenance_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Due:</span>
            <span className={`font-medium ${
              status === 'overdue' ? 'text-red-700' :
              status === 'due' ? 'text-yellow-700' :
              'text-gray-900'
            }`}>
              {format(new Date(item.next_maintenance_date), 'MMM d, yyyy')}
              {daysUntilDue !== null && (
                <span className="ml-1 text-xs">
                  ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `in ${daysUntilDue} days`})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Location */}
        {item.assigned_to_name && (
          <div className="flex items-center gap-2 text-sm">
            {item.assigned_to_type === 'physical_address' ? (
              <MapPin className="h-4 w-4 text-gray-400" />
            ) : (
              <User className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-gray-500">Location:</span>
            <span className="text-gray-900">{item.assigned_to_name}</span>
          </div>
        )}

        {/* Maintenance Interval */}
        {item.maintenance_interval_days && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Interval:</span>
            <span className="text-gray-900">Every {item.maintenance_interval_days} days</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {item.maintenance_notes && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 text-xs">{item.maintenance_notes}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => onComplete(item)}
          variant={config.buttonVariant}
          className="flex-1"
        >
          Complete Maintenance
        </Button>
      </div>
    </div>
  )
}
