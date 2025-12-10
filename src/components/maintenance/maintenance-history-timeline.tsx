'use client'

import { format, isSameDay, parseISO } from 'date-fns'
import { CheckCircle, Package, User, FileText, Calendar, Wrench } from 'lucide-react'

interface MaintenanceHistoryTimelineProps {
  records: any[]
}

export function MaintenanceHistoryTimeline({ records }: MaintenanceHistoryTimelineProps) {
  // Group records by date
  const groupedRecords = records.reduce((acc, record) => {
    const date = format(new Date(record.maintenance_date), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(record)
    return acc
  }, {} as Record<string, any[]>)

  const sortedDates = Object.keys(groupedRecords).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-6">
      {sortedDates.map((date, dateIndex) => {
        const dateRecords = groupedRecords[date]
        const isToday = isSameDay(new Date(date), new Date())
        const dateObj = new Date(date)

        return (
          <div key={date} className="relative">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-4 px-4 py-3 mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {isToday ? 'Today' : format(dateObj, 'EEEE, MMMM d, yyyy')}
                </h3>
                <span className="text-sm text-gray-500">
                  ({dateRecords.length} {dateRecords.length === 1 ? 'record' : 'records'})
                </span>
              </div>
            </div>

            {/* Timeline for this date */}
            <div className="relative pl-8">
              {/* Vertical line */}
              {dateIndex < sortedDates.length - 1 && (
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Records */}
              <div className="space-y-4">
                {dateRecords.map((record: any, recordIndex: number) => (
                  <div key={record.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-5 top-4 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />

                    {/* Record Card */}
                    <div className="bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {record.inventory_item?.item_name || 'Unknown Item'}
                            </h4>
                            {record.inventory_item?.model && (
                              <p className="text-sm text-gray-600 truncate">
                                {record.inventory_item.model}
                              </p>
                            )}
                          </div>
                        </div>
                        {record.created_at && (
                          <span className="text-xs text-gray-500">
                            {format(new Date(record.created_at), 'h:mm a')}
                          </span>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {/* Item Category */}
                        {record.inventory_item?.item_category && (
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Category:</span>
                            <span className="text-gray-900 font-medium">
                              {record.inventory_item.item_category}
                            </span>
                          </div>
                        )}

                        {/* Performed By */}
                        {record.performed_by && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Performed by:</span>
                            <span className="text-gray-900 font-medium">
                              {record.performed_by}
                            </span>
                          </div>
                        )}

                        {/* Next Maintenance */}
                        {record.next_maintenance_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Wrench className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Next due:</span>
                            <span className="text-gray-900 font-medium">
                              {format(new Date(record.next_maintenance_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}

                        {/* Serial Number */}
                        {record.inventory_item?.serial_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">S/N:</span>
                            <span className="text-gray-900 font-mono text-xs">
                              {record.inventory_item.serial_number}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {record.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                {record.notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Linked Task */}
                      {record.task_id && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Linked to task #{record.task_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
