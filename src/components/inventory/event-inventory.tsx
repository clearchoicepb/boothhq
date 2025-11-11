'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Package,
  User,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Printer,
  Plus,
  RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'
import { useUpdateInventoryItem } from '@/hooks/useInventoryItemsData'

interface EventInventoryProps {
  eventId: string
  eventName?: string
  eventDate?: string
  compact?: boolean
}

interface EventInventoryData {
  event: {
    id: string
    event_name: string
    event_date: string
  }
  inventory: any[]
  total_items: number
  by_staff: Array<{
    staff_id: string
    staff_name: string
    items: any[]
  }>
  ready_count: number
  needs_prep_count: number
}

export function EventInventory({
  eventId,
  eventName,
  eventDate,
  compact = false
}: EventInventoryProps) {
  const [data, setData] = useState<EventInventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set())

  const updateItem = useUpdateInventoryItem()

  useEffect(() => {
    fetchEventInventory()
  }, [eventId])

  const fetchEventInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/inventory`)
      if (!response.ok) {
        throw new Error('Failed to fetch event inventory')
      }
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const toggleStaffExpanded = (staffId: string) => {
    const newExpanded = new Set(expandedStaff)
    if (newExpanded.has(staffId)) {
      newExpanded.delete(staffId)
    } else {
      newExpanded.add(staffId)
    }
    setExpandedStaff(newExpanded)
  }

  const printPackingList = (staffMember?: { staff_name: string; items: any[] }) => {
    const itemsToPrint = staffMember ? staffMember.items : (data?.inventory || [])
    const title = staffMember
      ? `Packing List - ${staffMember.staff_name}`
      : `Equipment List - ${data?.event.event_name || eventName || 'Event'}`

    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
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
        <h1>${title}</h1>
        <div class="meta">
          <div><strong>Event:</strong> ${data?.event.event_name || eventName || 'Unknown'}</div>
          ${eventDate || data?.event.event_date ? `<div><strong>Date:</strong> ${format(new Date(eventDate || data?.event.event_date || ''), 'EEEE, MMM d, yyyy')}</div>` : ''}
          <div><strong>Total Items:</strong> ${itemsToPrint.length}</div>
          ${staffMember ? `<div><strong>Staff Member:</strong> ${staffMember.staff_name}</div>` : ''}
          <div><strong>Printed:</strong> ${format(new Date(), 'MMM d, yyyy h:mm a')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="checkbox">☐</th>
              <th>Item</th>
              <th>Category</th>
              <th>Serial/Qty</th>
              <th>Status</th>
              <th>Return Date</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToPrint.map((item: any) => `
              <tr>
                <td class="checkbox">☐</td>
                <td>
                  ${item.item_name}${item.model ? ` (${item.model})` : ''}
                </td>
                <td>${item.item_category}</td>
                <td>${item.tracking_type === 'serial_number' ? item.serial_number : `${item.total_quantity} units`}</td>
                <td>${item.assignment_type === 'event_checkout' ? '✓ Ready' : '⚠ Needs Prep'}</td>
                <td>${item.expected_return_date ? format(new Date(item.expected_return_date), 'MMM d, yyyy') : 'Not set'}</td>
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

  const handleMarkReturned = async (itemId: string) => {
    try {
      await updateItem.mutateAsync({
        itemId,
        itemData: {
          assignment_type: 'warehouse',
          event_id: null,
          expected_return_date: null
        }
      })
      // Refresh data
      fetchEventInventory()
    } catch (err: any) {
      alert(err.message || 'Failed to mark item as returned')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading inventory...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error loading inventory</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <Button onClick={fetchEventInventory} className="mt-3" variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  if (compact) {
    return (
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <h3 className="font-medium text-gray-900">Equipment</h3>
            <span className="text-sm text-gray-500">
              ({data.total_items} items)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => printPackingList()}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
        <div className="p-4">
          {data.total_items === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No equipment assigned yet
            </div>
          ) : (
            <div className="space-y-2">
              {data.inventory.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {item.item_name}
                      {item.model && ` (${item.model})`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.item_category}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.assigned_to_name || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Equipment</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {data.total_items}
              </div>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Ready to Go</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {data.ready_count}
              </div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Needs Prep</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">
                {data.needs_prep_count}
              </div>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Equipment by Staff */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Equipment by Staff Member</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => printPackingList()}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print All
          </Button>
        </div>

        {data.by_staff.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <div>No equipment assigned yet</div>
            <div className="text-sm mt-1">
              Use the inventory page to assign equipment to this event
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {data.by_staff.map((staff) => (
              <div key={staff.staff_id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {staff.staff_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({staff.items.length} items)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => printPackingList(staff)}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>

                <div className="space-y-2">
                  {staff.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {item.item_name}
                          {item.model && <span className="text-gray-500"> ({item.model})</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          <span>{item.item_category}</span>
                          {item.serial_number && (
                            <span>S/N: {item.serial_number}</span>
                          )}
                          {item.expected_return_date && (
                            <span>Return: {format(new Date(item.expected_return_date), 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {item.assignment_type === 'event_checkout' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            Needs Prep
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Equipment List */}
      {data.inventory.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">All Equipment</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Item</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Serial/Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Return Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.inventory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      {item.model && (
                        <div className="text-xs text-gray-500">{item.model}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.item_category}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.tracking_type === 'serial_number'
                        ? item.serial_number
                        : `${item.total_quantity} units`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {item.assigned_to_type === 'user' && <User className="h-3 w-3 text-gray-400" />}
                        {item.assigned_to_type === 'physical_address' && <MapPin className="h-3 w-3 text-gray-400" />}
                        <span className="text-gray-700">{item.assigned_to_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.assignment_type === 'event_checkout' ? (
                        <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-700 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          Needs Prep
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.expected_return_date ? (
                        format(new Date(item.expected_return_date), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
