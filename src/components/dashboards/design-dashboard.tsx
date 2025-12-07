'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import {
  Palette,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  User,
  ExternalLink,
  Save,
  Package,
  Paperclip,
  Trash2,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import AttachmentUpload from '@/components/attachment-upload'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboards')

interface Designer {
  id: string
  first_name?: string
  last_name?: string
  email: string
}

interface DesignStatus {
  id: string
  name: string
  slug: string
  is_active: boolean
}

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

interface EventWithDates {
  event_dates?: Array<{ event_date: string }>
  start_date?: string
}

interface DashboardData {
  items: DesignItem[]
  stats: {
    total: number
    missedDeadline: number
    urgent: number
    dueSoon: number
    onTime: number
    completed: number
    recentCompletions: number
    physicalItems: number
  }
  categories: {
    missedDeadline: DesignItem[]
    urgent: DesignItem[]
    dueSoon: DesignItem[]
    onTime: DesignItem[]
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
  const { getSetting } = useSettings()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [designers, setDesigners] = useState<Designer[]>([])
  const [designStatuses, setDesignStatuses] = useState<DesignStatus[]>([])
  const [selectedDesigner, setSelectedDesigner] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedTask, setSelectedTask] = useState<DesignItem | null>(null)
  const [taskStatus, setTaskStatus] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [attachmentRefreshKey, setAttachmentRefreshKey] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isDesignManager, setIsDesignManager] = useState(false)
  
  // Bulk actions state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Get tenant colors from settings (with fallback defaults)
  const PRIMARY_COLOR = getSetting('appearance.primaryColor', '#347dc4')
  const SECONDARY_COLOR = getSetting('appearance.secondaryColor', '#8b5cf6')

  // Fetch current user and determine manager status (runs once on mount)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const user = await res.json()
          setCurrentUser(user)
          
          // Check if user is a design manager
          const managerDepts = user.manager_of_departments || []
          const isManager = managerDepts.includes('design')
          setIsDesignManager(isManager)
          
          // If not a manager, automatically filter to show only their tasks
          if (!isManager && user.id) {
            setSelectedDesigner(user.id)
          }
        }
      } catch (error) {
        log.error({ error }, '[DesignDashboard] Error fetching current user')
      }
    }
    
    fetchCurrentUser()
  }, []) // Empty dependency array - run once on mount

  useEffect(() => {
    log.debug('useEffect triggered')

    const fetchDashboardData = async () => {
      log.debug('Starting fetchDashboardData')
      try {
        let url = '/api/design/dashboard'
        const urlParams = new URLSearchParams()
        if (selectedDesigner) urlParams.append('designer_id', selectedDesigner)
        if (selectedStatus) urlParams.append('status', selectedStatus)
        if (urlParams.toString()) url += `?${urlParams.toString()}`

        log.debug('Fetching:', url)
        const res = await fetch(url)
        log.debug('Response status:', res.status)

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`)
        }

        const dashboardData = await res.json()
        log.debug('Data received:', dashboardData)
        setData(dashboardData)
      } catch (error) {
        log.error({ error }, '[DesignDashboard] Error fetching dashboard')
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    const fetchDesigners = async () => {
      log.debug('Starting fetchDesigners')
      try {
        const res = await fetch('/api/users')
        const responseData = await res.json()
        setDesigners(responseData.users || responseData || [])
      } catch (error) {
        log.error({ error }, '[DesignDashboard] Error fetching designers')
      }
    }

    const fetchDesignStatuses = async () => {
      log.debug('Starting fetchDesignStatuses')
      try {
        const res = await fetch('/api/design/statuses')
        const responseData = await res.json()
        setDesignStatuses(responseData.statuses || [])
      } catch (error) {
        log.error({ error }, '[DesignDashboard] Error fetching design statuses')
      }
    }

    fetchDashboardData()
    fetchDesigners()
    fetchDesignStatuses()
  }, [selectedDesigner, selectedStatus])

  const getDaysUntil = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getEventDate = (event: EventWithDates): string => {
    return event.event_dates?.[0]?.event_date || event.start_date || new Date().toISOString()
  }

  const navigateToEvent = (eventId: string) => {
    router.push(`/${tenant}/events/${eventId}`)
  }

  const openTaskModal = (task: DesignItem) => {
    setSelectedTask(task)
    setTaskStatus(task.status)
    setTaskNotes('') // Could load existing notes if available
    setAttachmentRefreshKey(prev => prev + 1)
  }

  const closeTaskModal = () => {
    setSelectedTask(null)
    setTaskStatus('')
    setTaskNotes('')
  }

  const saveTaskUpdates = async () => {
    if (!selectedTask) return

    setSaving(true)
    try {
      const response = await fetch(`/api/events/${selectedTask.event.id}/design-items/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: taskStatus,
          notes: taskNotes || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to update task')

      toast.success('Task updated successfully')
      closeTaskModal()

      // Refresh dashboard data
      const urlParams = new URLSearchParams()
      if (selectedDesigner) urlParams.append('designer_id', selectedDesigner)
      if (selectedStatus) urlParams.append('status', selectedStatus)
      const url = `/api/design/dashboard${urlParams.toString() ? `?${urlParams.toString()}` : ''}`

      const res = await fetch(url)
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      }
    } catch (error) {
      log.error({ error }, 'Error updating task')
      toast.error('Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  // Bulk action handlers
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === data?.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(data?.items.map(item => item.id) || []))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedItems.size} design item${selectedItems.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const deletePromises = Array.from(selectedItems).map(itemId => {
        const item = data?.items.find(i => i.id === itemId)
        if (!item) return Promise.resolve()
        
        return fetch(`/api/events/${item.event.id}/design-items/${itemId}`, {
          method: 'DELETE'
        })
      })

      await Promise.all(deletePromises)
      
      toast.success(`Successfully deleted ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}`)
      setSelectedItems(new Set())
      
      // Refresh dashboard data
      const urlParams = new URLSearchParams()
      if (selectedDesigner) urlParams.append('designer_id', selectedDesigner)
      if (selectedStatus) urlParams.append('status', selectedStatus)
      const url = `/api/design/dashboard${urlParams.toString() ? `?${urlParams.toString()}` : ''}`

      const res = await fetch(url)
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      }
    } catch (error) {
      log.error({ error }, 'Error deleting items')
      toast.error('Failed to delete some items')
    } finally {
      setIsDeleting(false)
    }
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
            <Palette className="h-8 w-8 mr-3" style={{ color: PRIMARY_COLOR }} />
            Design Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Creative workflow and deadline management</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-400" />

        {/* Designer filter - only show to managers */}
        {isDesignManager && (
          <select
            value={selectedDesigner}
            onChange={(e) => setSelectedDesigner(e.target.value)}
            aria-label="Filter by designer"
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{
              '--tw-ring-color': PRIMARY_COLOR,
            borderColor: 'rgb(209 213 219)'
          } as React.CSSProperties}
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
        )}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
          style={{
            '--tw-ring-color': PRIMARY_COLOR,
            borderColor: 'rgb(209 213 219)'
          } as React.CSSProperties}
        >
          <option value="">All Statuses</option>
          {designStatuses
            .filter((status) => status.is_active)
            .map((status) => (
              <option key={status.id} value={status.slug}>
                {status.name}
              </option>
            ))}
        </select>

        {(selectedDesigner || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedDesigner('')
              setSelectedStatus('')
            }}
            className="text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: PRIMARY_COLOR }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          title="Missed Deadline"
          value={data.stats.missedDeadline}
          icon={AlertCircle}
          color="red"
          subtitle="Too late to offer"
        />
        <KPICard
          title="Urgent"
          value={data.stats.urgent}
          icon={Clock}
          color="orange"
          subtitle="Needs immediate attention"
        />
        <KPICard
          title="Due Soon"
          value={data.stats.dueSoon}
          icon={Calendar}
          color="yellow"
          subtitle="Before due date"
        />
        <KPICard
          title="Physical Items"
          value={data.stats.physicalItems}
          icon={Package}
          color="purple"
          subtitle="Vendor-dependent"
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
              <Palette className="h-6 w-6 mr-2" style={{ color: PRIMARY_COLOR }} />
              All Design Tasks by Event
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === data.items.length && data.items.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {groupItemsByEvent(data.items).map(([, items], eventIndex) => {
                  const bgColor = eventIndex % 2 === 0 ? PRIMARY_COLOR : SECONDARY_COLOR
                  const textColor = getTextColor(bgColor)

                  return items.map((item) => {
                    const daysUntil = getDaysUntil(item.design_deadline)
                    const itemName = item.item_name || item.design_item_type?.name || 'Design Item'
                    const designerName = item.assigned_designer
                      ? item.assigned_designer.first_name && item.assigned_designer.last_name
                        ? `${item.assigned_designer.first_name} ${item.assigned_designer.last_name}`
                        : item.assigned_designer.email
                      : 'Unassigned'

                    const isPhysical = item.design_item_type?.type === 'physical'

                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer hover:opacity-90 transition-opacity text-sm"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor
                        }}
                      >
                        <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
                          <div className="flex items-center">
                            {daysUntil < 0 && (
                              <AlertCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            )}
                            {daysUntil >= 0 && daysUntil <= 3 && (
                              <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            )}
                            <span className="font-medium">{itemName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full" style={{
                            backgroundColor: isPhysical
                              ? (textColor === '#ffffff' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(251, 146, 60, 0.2)')
                              : (textColor === '#ffffff' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(96, 165, 250, 0.2)')
                          }}>
                            {isPhysical ? '📦 Physical' : '💻 Digital'}
                          </span>
                        </td>
                        <td className="px-4 py-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateToEvent(item.event.id)
                            }}
                            className="font-medium hover:underline inline-flex items-center"
                            style={{ color: textColor }}
                          >
                            {item.event.title}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                          <div className="text-xs opacity-80">
                            {new Date(getEventDate(item.event)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
                          {item.event.account?.name || '-'}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
                          {new Date(item.design_deadline).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
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
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            {designerName}
                          </div>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(item)}>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{
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
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            Go to Events
          </button>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal isOpen={!!selectedTask} onClose={closeTaskModal} title="Design Task Details">
          <div className="space-y-6">
            {/* Task Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Task Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Task Name:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedTask.item_name || selectedTask.design_item_type?.name || 'Design Item'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Event:</span>
                  <button
                    onClick={() => {
                      closeTaskModal()
                      navigateToEvent(selectedTask.event.id)
                    }}
                    className="ml-2 font-medium text-blue-600 hover:text-blue-800 inline-flex items-center"
                  >
                    {selectedTask.event.title}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </button>
                </div>
                {selectedTask.event.account && (
                  <div>
                    <span className="text-gray-600">Account:</span>
                    <span className="ml-2 font-medium text-gray-900">{selectedTask.event.account.name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Design Deadline:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {new Date(selectedTask.design_deadline).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Event Date:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {new Date(getEventDate(selectedTask.event)).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Assigned To:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedTask.assigned_designer
                      ? selectedTask.assigned_designer.first_name && selectedTask.assigned_designer.last_name
                        ? `${selectedTask.assigned_designer.first_name} ${selectedTask.assigned_designer.last_name}`
                        : selectedTask.assigned_designer.email
                      : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedTask.design_item_type?.type === 'physical' ? '📦 Physical' : '💻 Digital'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value)}
                aria-label="Task status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                style={{
                  '--tw-ring-color': PRIMARY_COLOR,
                  borderColor: 'rgb(209 213 219)'
                } as React.CSSProperties}
              >
                {designStatuses
                  .filter((status) => status.is_active)
                  .map((status) => (
                    <option key={status.id} value={status.slug}>
                      {status.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Notes
              </label>
              <Textarea
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Add any notes or updates about this task..."
                rows={4}
                className="w-full"
              />
            </div>

            {/* Design Proof Upload */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Paperclip className="h-4 w-4 mr-2" />
                Upload Design Proof
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-4">
                  Upload design proofs, mockups, or final files. These will appear in the Files tab on the event detail page.
                </p>
                <AttachmentUpload
                  key={attachmentRefreshKey}
                  entityType="event"
                  entityId={selectedTask.event.id}
                  onUploadComplete={() => {
                    toast.success('Design proof uploaded successfully')
                    setAttachmentRefreshKey(prev => prev + 1)
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={closeTaskModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={saveTaskUpdates}
                disabled={saving}
                className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-opacity"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  title: string
  value: number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: 'yellow' | 'green' | 'red' | 'orange' | 'purple'
}

function KPICard({ title, value, subtitle, icon: Icon, color }: KPICardProps) {
  const colors: Record<KPICardProps['color'], string> = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
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

