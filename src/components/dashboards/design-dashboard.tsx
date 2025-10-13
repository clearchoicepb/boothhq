'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/tenant-context'
import {
  Palette,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  TrendingUp,
  User
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface DesignItem {
  id: string
  item_name?: string
  design_deadline: string
  status: string
  design_item_type?: {
    id: string
    name: string
    type: string
  }
  assigned_designer?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  event: {
    id: string
    title: string
    start_date?: string
    event_dates?: Array<{ event_date: string }>
    account?: {
      name: string
    }
  }
}

interface DashboardData {
  items: DesignItem[]
  stats: {
    total: number
    overdue: number
    urgent: number
    dueThisWeek: number
    upcoming: number
    completed: number
    recentCompletions: number
  }
  categories: {
    overdue: DesignItem[]
    urgent: DesignItem[]
    dueThisWeek: DesignItem[]
    upcoming: DesignItem[]
    completed: DesignItem[]
  }
}

// Helper function to determine if color is light or dark
const getLuminance = (hex: string): number => {
  const rgb = parseInt(hex.replace('#', ''), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  // Relative luminance formula
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum / 255
}

const getTextColor = (bgColor: string): string => {
  const luminance = getLuminance(bgColor)
  // If luminance > 0.5, use dark text, otherwise use light text
  return luminance > 0.5 ? '#1f2937' : '#ffffff'
}

export function DesignDashboard() {
  const { tenant } = useTenant()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [designers, setDesigners] = useState<any[]>([])
  const [selectedDesigner, setSelectedDesigner] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Define tenant colors - primary and secondary
  const PRIMARY_COLOR = '#347dc4' // Blue
  const SECONDARY_COLOR = '#8b5cf6' // Purple

  useEffect(() => {
    console.log('[DesignDashboard] useEffect triggered')

    const fetchDashboardData = async () => {
      console.log('[DesignDashboard] Starting fetchDashboardData')
      try {
        let url = '/api/design/dashboard'
        const urlParams = new URLSearchParams()
        if (selectedDesigner) urlParams.append('designer_id', selectedDesigner)
        if (selectedStatus) urlParams.append('status', selectedStatus)
        if (urlParams.toString()) url += `?${urlParams.toString()}`

        console.log('[DesignDashboard] Fetching:', url)
        const res = await fetch(url)
        console.log('[DesignDashboard] Response status:', res.status)

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`)
        }

        const dashboardData = await res.json()
        console.log('[DesignDashboard] Data received:', dashboardData)
        setData(dashboardData)
      } catch (error) {
        console.error('[DesignDashboard] Error fetching dashboard:', error)
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    const fetchDesigners = async () => {
      console.log('[DesignDashboard] Starting fetchDesigners')
      try {
        const res = await fetch('/api/users')
        const responseData = await res.json()
        setDesigners(responseData.users || responseData || [])
      } catch (error) {
        console.error('[DesignDashboard] Error fetching designers:', error)
      }
    }

    fetchDashboardData()
    fetchDesigners()
  }, [selectedDesigner, selectedStatus])

  const getDaysUntil = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getEventDate = (event: any) => {
    return event.event_dates?.[0]?.event_date || event.start_date
  }

  const navigateToEvent = (eventId: string) => {
    router.push(`/${tenant}/events/${eventId}`)
  }

  // Group items by event
  const groupItemsByEvent = (items: DesignItem[]) => {
    const grouped = new Map<string, DesignItem[]>()
    items.forEach(item => {
      const eventId = item.event.id
      if (!grouped.has(eventId)) {
        grouped.set(eventId, [])
      }
      grouped.get(eventId)!.push(item)
    })
    return Array.from(grouped.entries())
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Palette className="h-8 w-8 mr-3 text-purple-600" />
            Design Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Creative workflow and deadline management</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-400" />

        <select
          value={selectedDesigner}
          onChange={(e) => setSelectedDesigner(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">All Designers</option>
          {designers.map(designer => (
            <option key={designer.id} value={designer.id}>
              {designer.first_name && designer.last_name
                ? `${designer.first_name} ${designer.last_name}`
                : designer.email}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="awaiting_approval">Awaiting Approval</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
        </select>

        {(selectedDesigner || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedDesigner('')
              setSelectedStatus('')
            }}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Overdue"
          value={data.stats.overdue}
          icon={AlertCircle}
          color="red"
          subtitle="Past deadline"
        />
        <KPICard
          title="Urgent"
          value={data.stats.urgent}
          icon={Clock}
          color="orange"
          subtitle="Due in ≤3 days"
        />
        <KPICard
          title="Due This Week"
          value={data.stats.dueThisWeek}
          icon={Calendar}
          color="yellow"
          subtitle="Due in 4-7 days"
        />
        <KPICard
          title="Recent Completions"
          value={data.stats.recentCompletions}
          icon={CheckCircle}
          color="green"
          subtitle="Last 7 days"
        />
      </div>

      {/* All Tasks Grouped by Event */}
      {data.items.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Palette className="h-6 w-6 mr-2 text-purple-600" />
              All Design Tasks by Event
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Until
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Designer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupItemsByEvent(data.items).map(([eventId, items], eventIndex) => {
                  const bgColor = eventIndex % 2 === 0 ? PRIMARY_COLOR : SECONDARY_COLOR
                  const textColor = getTextColor(bgColor)

                  return items.map((item, itemIndex) => {
                    const daysUntil = getDaysUntil(item.design_deadline)
                    const itemName = item.item_name || item.design_item_type?.name || 'Design Item'
                    const designerName = item.assigned_designer
                      ? item.assigned_designer.first_name && item.assigned_designer.last_name
                        ? `${item.assigned_designer.first_name} ${item.assigned_designer.last_name}`
                        : item.assigned_designer.email
                      : 'Unassigned'

                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor
                        }}
                        onClick={() => navigateToEvent(eventId)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {daysUntil < 0 && (
                              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                            )}
                            {daysUntil >= 0 && daysUntil <= 3 && (
                              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                            )}
                            <span className="font-medium">{itemName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{item.event.title}</div>
                          {item.event.start_date && (
                            <div className="text-xs opacity-80">
                              Event: {new Date(getEventDate(item.event)).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.event.account?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(item.design_deadline).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {daysUntil < 0 ? (
                              <span className="font-bold">{Math.abs(daysUntil)} days overdue</span>
                            ) : daysUntil === 0 ? (
                              <span className="font-bold">Due today</span>
                            ) : daysUntil === 1 ? (
                              <span className="font-bold">Due tomorrow</span>
                            ) : (
                              <span>{daysUntil} days</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 flex-shrink-0" />
                            {designerName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full" style={{
                            backgroundColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                          }}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.stats.total === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Palette className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Design Items Yet</h3>
          <p className="text-gray-600 mb-6">
            Design items will appear here when they are added to events
          </p>
          <button
            onClick={() => router.push(`/${tenant}/events`)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Events
          </button>
        </div>
      )}
    </div>
  )
}

// KPI Card Component
function KPICard({ title, value, subtitle, icon: Icon, color }: any) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}

