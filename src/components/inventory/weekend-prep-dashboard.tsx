'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  User,
  MapPin,
  Package2
} from 'lucide-react'
import { format, isToday, isPast, isFuture } from 'date-fns'
import Link from 'next/link'
import { groupAndSortInventoryItems } from './inventory-grouping'

interface WeekendPrepData {
  weekend_start: string
  weekend_end: string
  events: EventSummary[]
  total_events: number
  total_equipment_out: number
  returns: {
    total: number
    returned: number
    expected_today: number
    overdue: number
    items: any[]
  }
}

interface EventSummary {
  id: string
  title: string
  start_date: string
  inventory_count: number
  inventory: any[]
  all_ready: boolean
  needs_prep: number
}

export function WeekendPrepDashboard() {
  const [data, setData] = useState<WeekendPrepData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [collapsedReturnSections, setCollapsedReturnSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchWeekendData()
  }, [])

  const fetchWeekendData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/inventory-items/weekend-prep')
      if (!response.ok) {
        throw new Error('Failed to fetch weekend prep data')
      }
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const toggleReturnSection = (sectionId: string) => {
    setCollapsedReturnSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const toggleAllReturnSections = (sectionsCount: number) => {
    if (collapsedReturnSections.size === sectionsCount) {
      // All collapsed, expand all
      setCollapsedReturnSections(new Set())
    } else {
      // Some or none collapsed, collapse all
      const allIds = returnSections.map(s => s.id)
      setCollapsedReturnSections(new Set(allIds))
    }
  }

  const printEventChecklist = (event: EventSummary) => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Equipment Checklist - ${event.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 10px; }
          .meta { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f5f5f5; }
          .checkbox { width: 30px; text-align: center; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Equipment Checklist</h1>
        <div class="meta">
          <div><strong>Event:</strong> ${event.title}</div>
          <div><strong>Date:</strong> ${format(new Date(event.start_date), 'EEEE, MMM d, yyyy')}</div>
          <div><strong>Total Items:</strong> ${event.inventory.length}</div>
          <div><strong>Printed:</strong> ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="checkbox">☐</th>
              <th>Item</th>
              <th>Category</th>
              <th>Serial/Qty</th>
              <th>Assigned To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${event.inventory.map(item => `
              <tr>
                <td class="checkbox">☐</td>
                <td>
                  ${item.item_name}${item.model ? ` (${item.model})` : ''}
                </td>
                <td>${item.item_category}</td>
                <td>${item.tracking_type === 'serial_number' ? item.serial_number : `${item.total_quantity} units`}</td>
                <td>${item.assigned_to_name || 'Unassigned'}</td>
                <td>${item.assignment_type === 'event_checkout' ? '✓ Ready' : '⚠ Needs Prep'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Print</button>
      </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading weekend prep data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error loading data</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <Button onClick={fetchWeekendData} className="mt-3" variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available
      </div>
    )
  }

  const weekendDate = format(new Date(data.weekend_start), 'MMM d') + ' - ' + format(new Date(data.weekend_end), 'MMM d, yyyy')

  // Group return items by product group and location
  const returnSections = data.returns.items.length > 0
    ? groupAndSortInventoryItems(data.returns.items.filter((item: any) => item.assignment_type !== 'warehouse'))
    : []

  const getSectionIcon = (type: string) => {
    if (type === 'product_group') return <Package2 className="h-3.5 w-3.5" />
    if (type === 'location') return <span className="text-sm">👤</span>
    return <span className="text-sm">📦</span>
  }

  const getSectionColor = (type: string) => {
    if (type === 'product_group') return 'bg-purple-50 border-purple-200 text-purple-900'
    if (type === 'location') return 'bg-blue-50 border-blue-200 text-blue-900'
    return 'bg-gray-50 border-gray-200 text-gray-900'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-bold">Weekend Prep Dashboard</h2>
        </div>
        <p className="text-blue-100 text-sm">
          {weekendDate}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Events This Weekend</div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">
                {data.total_events}
              </div>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Equipment Going Out</div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">
                {data.total_equipment_out}
              </div>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Items Due Back</div>
              <div className="text-2xl font-bold text-gray-900 mt-0.5">
                {data.returns.total - data.returns.returned}
              </div>
              {data.returns.overdue > 0 && (
                <div className="text-xs text-red-600 mt-0.5">
                  {data.returns.overdue} overdue
                </div>
              )}
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(data.returns.overdue > 0 || data.returns.expected_today > 0 || data.events.some(e => e.needs_prep > 0)) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-yellow-900 mb-1 text-sm">Action Items</div>
              <ul className="space-y-1 text-sm text-yellow-800">
                {data.returns.overdue > 0 && (
                  <li>• {data.returns.overdue} items overdue for return</li>
                )}
                {data.returns.expected_today > 0 && (
                  <li>• {data.returns.expected_today} items expected back today</li>
                )}
                {data.events.filter(e => e.needs_prep > 0).length > 0 && (
                  <li>• {data.events.filter(e => e.needs_prep > 0).map(e => e.needs_prep).reduce((a, b) => a + b, 0)} items need prep before checkout</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Events Breakdown */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Events Breakdown</h3>
        {data.events.length === 0 ? (
          <div className="bg-white border rounded-lg p-6 text-center text-gray-500">
            <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">No events scheduled for this weekend</div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.events.map(event => {
              const isExpanded = expandedEvents.has(event.id)

              return (
                <div key={event.id} className="bg-white border rounded-lg overflow-hidden">
                  {/* Event Header */}
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/events/${event.id}`}
                            className="text-base font-medium text-gray-900 hover:text-blue-600"
                          >
                            {event.title}
                          </Link>
                          {event.all_ready ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              {event.needs_prep} Need Prep
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {format(new Date(event.start_date), 'EEEE, MMM d, yyyy')} • {event.inventory_count} items
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printEventChecklist(event)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpanded(event.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Event Details (Expanded) */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-3">
                      {event.inventory.length === 0 ? (
                        <div className="text-xs text-gray-500 text-center py-3">
                          No equipment assigned yet
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-700">Item</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-700">Category</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-700">Assigned To</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-700">Status</th>
                                <th className="px-2 py-1.5 text-left font-medium text-gray-700">Return Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {event.inventory.map((item: any) => (
                                <tr key={item.id} className="hover:bg-white">
                                  <td className="px-2 py-1.5">
                                    <div className="font-medium text-gray-900">{item.item_name}</div>
                                    {item.model && (
                                      <div className="text-[10px] text-gray-500">{item.model}</div>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-700">{item.item_category}</td>
                                  <td className="px-2 py-1.5">
                                    {item.assigned_to_type === 'user' && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3 text-gray-400" />
                                        <span className="text-gray-700">{item.assigned_to_name}</span>
                                      </div>
                                    )}
                                    {item.assigned_to_type === 'physical_address' && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 text-gray-400" />
                                        <span className="text-gray-700">{item.assigned_to_name}</span>
                                      </div>
                                    )}
                                    {!item.assigned_to_type && (
                                      <span className="text-gray-400">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {item.assignment_type === 'event_checkout' ? (
                                      <span className="inline-flex items-center gap-1 text-green-700">
                                        <CheckCircle className="h-3 w-3" />
                                        Ready
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-yellow-700">
                                        <AlertTriangle className="h-3 w-3" />
                                        Prep
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-700">
                                    {item.expected_return_date ? (
                                      format(new Date(item.expected_return_date), 'MMM d')
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Returns Section */}
      {data.returns.total > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Returns This Week</h3>
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Summary */}
            <div className="p-3 bg-gray-50 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold text-gray-900">{data.returns.total}</div>
                  <div className="text-[10px] text-gray-500">Total Due</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{data.returns.returned}</div>
                  <div className="text-[10px] text-gray-500">Returned</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-orange-600">{data.returns.expected_today}</div>
                  <div className="text-[10px] text-gray-500">Expected Today</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">{data.returns.overdue}</div>
                  <div className="text-[10px] text-gray-500">Overdue</div>
                </div>
              </div>
            </div>

            {/* Toggle All Button */}
            {returnSections.length > 0 && (
              <div className="border-b bg-gray-50 px-3 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllReturnSections(returnSections.length)}
                  className="text-xs"
                >
                  {collapsedReturnSections.size === returnSections.length ? 'Expand All Groups' : 'Collapse All Groups'}
                </Button>
              </div>
            )}

            {/* Grouped Items List */}
            {returnSections.length > 0 ? (
              <div className="divide-y">
                {returnSections.map((section) => {
                  const isCollapsed = collapsedReturnSections.has(section.id)
                  const itemCount = section.items.length

                  return (
                    <div key={section.id}>
                      {/* Section Header */}
                      <div
                        className={`flex items-center border-b cursor-pointer ${getSectionColor(section.type)}`}
                        onClick={() => toggleReturnSection(section.id)}
                      >
                        <div className="flex items-center gap-2 px-3 py-2 font-semibold w-full text-sm">
                          {isCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                          {getSectionIcon(section.type)}
                          <span className="flex-1">{section.title}</span>
                          <span className="text-[10px] font-normal opacity-75">
                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Section Items */}
                      {!isCollapsed && (
                        <div className="bg-gray-50">
                          {section.items.map((item: any) => {
                            const dueDate = new Date(item.expected_return_date)
                            const isOverdue = isPast(dueDate) && !isToday(dueDate)
                            const isDueToday = isToday(dueDate)

                            return (
                              <div
                                key={item.id}
                                className={`px-3 py-2 border-b last:border-b-0 hover:bg-white transition-colors text-xs ${
                                  isOverdue ? 'bg-red-50' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900">{item.item_name}</div>
                                    {item.model && (
                                      <div className="text-[10px] text-gray-500">{item.model}</div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-gray-700 min-w-[80px]">
                                      {item.assigned_to_name || 'Unknown'}
                                    </div>
                                    <div className="min-w-[90px]">
                                      <div
                                        className={`font-medium ${
                                          isOverdue ? 'text-red-700' : isDueToday ? 'text-orange-700' : 'text-gray-700'
                                        }`}
                                      >
                                        {format(dueDate, 'MMM d, yyyy')}
                                      </div>
                                      {isOverdue && <div className="text-[10px] text-red-600">Overdue</div>}
                                      {isDueToday && <div className="text-[10px] text-orange-600">Due today</div>}
                                    </div>
                                    <div className="min-w-[70px]">
                                      {item.assignment_type === 'warehouse' ? (
                                        <span className="inline-flex items-center gap-1 text-green-700">
                                          <CheckCircle className="h-3 w-3" />
                                          Returned
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-orange-700">
                                          <Clock className="h-3 w-3" />
                                          Out
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              data.returns.items.length > 0 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  All items have been returned
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
