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
  ArrowRight,
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

export function DesignDashboard() {
  const { tenant } = useTenant()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [designers, setDesigners] = useState<any[]>([])
  const [selectedDesigner, setSelectedDesigner] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

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

      {/* Overdue Section */}
      {data.categories.overdue.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center">
            <AlertCircle className="h-6 w-6 mr-2" />
            Overdue - Immediate Action Required
          </h2>
          <div className="space-y-3">
            {data.categories.overdue.map(item => (
              <DesignItemCard
                key={item.id}
                item={item}
                urgency="overdue"
                onNavigate={navigateToEvent}
                getDaysUntil={getDaysUntil}
                getEventDate={getEventDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Urgent Section */}
      {data.categories.urgent.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-900 mb-4 flex items-center">
            <Clock className="h-6 w-6 mr-2" />
            Urgent - Due in 3 Days or Less
          </h2>
          <div className="space-y-3">
            {data.categories.urgent.map(item => (
              <DesignItemCard
                key={item.id}
                item={item}
                urgency="urgent"
                onNavigate={navigateToEvent}
                getDaysUntil={getDaysUntil}
                getEventDate={getEventDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due This Week */}
      {data.categories.dueThisWeek.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-yellow-600" />
            Due This Week
          </h2>
          <div className="space-y-3">
            {data.categories.dueThisWeek.map(item => (
              <DesignItemCard
                key={item.id}
                item={item}
                urgency="week"
                onNavigate={navigateToEvent}
                getDaysUntil={getDaysUntil}
                getEventDate={getEventDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {data.categories.upcoming.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" />
            Upcoming (Next 2 Weeks)
          </h2>
          <div className="space-y-3">
            {data.categories.upcoming.map(item => (
              <DesignItemCard
                key={item.id}
                item={item}
                urgency="upcoming"
                onNavigate={navigateToEvent}
                getDaysUntil={getDaysUntil}
                getEventDate={getEventDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Completions */}
      {data.categories.completed.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
            Recent Wins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.categories.completed.map(item => {
              const itemName = item.item_name || item.design_item_type?.name || 'Design Item'
              return (
                <div
                  key={item.id}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigateToEvent(item.event.id)}
                >
                  <div className="flex items-start mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{itemName}</p>
                      <p className="text-xs text-gray-600">{item.event.title}</p>
                    </div>
                  </div>
                </div>
              )
            })}
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

// Design Item Card Component
function DesignItemCard({ item, urgency, onNavigate, getDaysUntil, getEventDate }: any) {
  const daysUntil = getDaysUntil(item.design_deadline)
  const itemName = item.item_name || item.design_item_type?.name || 'Design Item'
  const eventDate = getEventDate(item.event)
  const designerName = item.assigned_designer
    ? item.assigned_designer.first_name && item.assigned_designer.last_name
      ? `${item.assigned_designer.first_name} ${item.assigned_designer.last_name}`
      : item.assigned_designer.email
    : 'Unassigned'

  const urgencyColors = {
    overdue: 'bg-red-100 border-red-300',
    urgent: 'bg-orange-100 border-orange-300',
    week: 'bg-yellow-100 border-yellow-300',
    upcoming: 'bg-blue-100 border-blue-300'
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-all ${urgencyColors[urgency]}`}
      onClick={() => onNavigate(item.event.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{itemName}</h4>
          <p className="text-sm text-gray-700 font-medium">{item.event.title}</p>
          {item.event.account && (
            <p className="text-xs text-gray-600">{item.event.account.name}</p>
          )}
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 text-xs mb-1">Design Deadline</p>
          <p className={`font-semibold ${urgency === 'overdue' ? 'text-red-700' : 'text-gray-900'}`}>
            {urgency === 'overdue'
              ? `${Math.abs(daysUntil)} days overdue`
              : daysUntil === 0
              ? 'Due today'
              : daysUntil === 1
              ? 'Due tomorrow'
              : `${daysUntil} days`}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(item.design_deadline).toLocaleDateString()}
          </p>
        </div>

        <div>
          <p className="text-gray-600 text-xs mb-1">Assigned To</p>
          <p className="font-medium text-gray-900 flex items-center text-sm">
            <User className="h-3 w-3 mr-1" />
            {designerName}
          </p>
        </div>
      </div>

      {eventDate && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="text-xs text-gray-600">
            Event Date: {new Date(eventDate).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
