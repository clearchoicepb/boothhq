'use client'

/**
 * Design Dashboard
 *
 * Uses the unified tasks API to display design tasks.
 * Replaces the old design-items-based dashboard.
 */

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
  Paperclip,
  Trash2,
  X,
  Plus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import AttachmentUpload from '@/components/attachment-upload'
import { AddTaskModal } from '@/components/dashboards/add-task-modal'
import { createLogger } from '@/lib/logger'
import type { TaskWithRelations, TaskDashboardData, TaskStatus } from '@/types/tasks'

const log = createLogger('dashboards')

interface Designer {
  id: string
  first_name?: string
  last_name?: string
  email: string
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

// Task status options
const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'needs_revision', label: 'Needs Revision' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
]

export function DesignDashboard() {
  const { tenant } = useTenant()
  const router = useRouter()
  const { getSetting } = useSettings()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [stats, setStats] = useState<TaskDashboardData['stats'] | null>(null)
  const [designers, setDesigners] = useState<Designer[]>([])
  const [selectedDesigner, setSelectedDesigner] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('pending')
  const [taskNotes, setTaskNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [attachmentRefreshKey, setAttachmentRefreshKey] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isDesignManager, setIsDesignManager] = useState(false)

  // Bulk actions state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Add task modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)

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
          const isManager = managerDepts.includes('design') || user.department_role === 'manager'
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
        let url = '/api/tasks/dashboard?taskType=design'
        if (selectedDesigner) url += `&assignedTo=${selectedDesigner}`

        log.debug({ url }, 'Fetching')
        const res = await fetch(url)
        log.debug({ status: res.status }, 'Response status')

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`)
        }

        const dashboardData: TaskDashboardData = await res.json()
        log.debug({ dashboardData }, 'Data received')

        // Filter by status client-side if needed
        let filteredTasks = dashboardData.tasks
        if (selectedStatus) {
          filteredTasks = filteredTasks.filter(t => t.status === selectedStatus)
        }

        setTasks(filteredTasks)
        setStats(dashboardData.stats)
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
        const res = await fetch('/api/users?department=design')
        const responseData = await res.json()
        setDesigners(responseData.users || responseData || [])
      } catch (error) {
        log.error({ error }, '[DesignDashboard] Error fetching designers')
      }
    }

    fetchDashboardData()
    fetchDesigners()
  }, [selectedDesigner, selectedStatus])

  const getDaysUntil = (deadline: string | null) => {
    if (!deadline) return null
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadlineDate.setHours(0, 0, 0, 0)
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const navigateToEvent = (eventId: string) => {
    router.push(`/${tenant}/events/${eventId}`)
  }

  const openTaskModal = (task: TaskWithRelations) => {
    setSelectedTask(task)
    setTaskStatus(task.status)
    setTaskNotes(task.internal_notes || '')
    setAttachmentRefreshKey(prev => prev + 1)
  }

  const closeTaskModal = () => {
    setSelectedTask(null)
    setTaskStatus('pending')
    setTaskNotes('')
  }

  const saveTaskUpdates = async () => {
    if (!selectedTask) return

    setSaving(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: taskStatus,
          internal_notes: taskNotes || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to update task')

      toast.success('Task updated successfully')
      closeTaskModal()

      // Refresh dashboard data
      let url = '/api/tasks/dashboard?taskType=design'
      if (selectedDesigner) url += `&assignedTo=${selectedDesigner}`

      const res = await fetch(url)
      if (res.ok) {
        const dashboardData: TaskDashboardData = await res.json()
        let filteredTasks = dashboardData.tasks
        if (selectedStatus) {
          filteredTasks = filteredTasks.filter(t => t.status === selectedStatus)
        }
        setTasks(filteredTasks)
        setStats(dashboardData.stats)
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
    if (selectedItems.size === tasks.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(tasks.map(item => item.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} task${selectedItems.size > 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const deletePromises = Array.from(selectedItems).map(itemId =>
        fetch(`/api/tasks/${itemId}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)

      toast.success(`Successfully deleted ${selectedItems.size} task${selectedItems.size > 1 ? 's' : ''}`)
      setSelectedItems(new Set())

      // Refresh dashboard data
      let url = '/api/tasks/dashboard?taskType=design'
      if (selectedDesigner) url += `&assignedTo=${selectedDesigner}`

      const res = await fetch(url)
      if (res.ok) {
        const dashboardData: TaskDashboardData = await res.json()
        let filteredTasks = dashboardData.tasks
        if (selectedStatus) {
          filteredTasks = filteredTasks.filter(t => t.status === selectedStatus)
        }
        setTasks(filteredTasks)
        setStats(dashboardData.stats)
      }
    } catch (error) {
      log.error({ error }, 'Error deleting tasks')
      toast.error('Failed to delete some tasks')
    } finally {
      setIsDeleting(false)
    }
  }

  // Group tasks by event
  const groupTasksByEvent = (taskList: TaskWithRelations[]) => {
    const grouped = new Map<string, TaskWithRelations[]>()
    taskList.forEach(task => {
      if (task.entity_type === 'event' && task.entity_id) {
        const eventId = task.entity_id
        if (!grouped.has(eventId)) {
          grouped.set(eventId, [])
        }
        grouped.get(eventId)!.push(task)
      } else {
        // Tasks not linked to events go under 'other'
        if (!grouped.has('other')) {
          grouped.set('other', [])
        }
        grouped.get('other')!.push(task)
      }
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
        <button
          onClick={() => setIsAddTaskModalOpen(true)}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity inline-flex items-center"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Task
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.size} task{selectedItems.size > 1 ? 's' : ''} selected
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
          {TASK_STATUSES.map(status => (
            <option key={status.value} value={status.value}>
              {status.label}
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
          title="Overdue"
          value={stats?.overdue ?? 0}
          icon={AlertCircle}
          color="red"
          subtitle="Past due date"
        />
        <KPICard
          title="Due Today"
          value={stats?.due_today ?? 0}
          icon={Clock}
          color="orange"
          subtitle="Needs attention"
        />
        <KPICard
          title="Due This Week"
          value={stats?.due_this_week ?? 0}
          icon={Calendar}
          color="yellow"
          subtitle="Coming up soon"
        />
        <KPICard
          title="In Progress"
          value={stats?.in_progress ?? 0}
          icon={Clock}
          color="blue"
          subtitle="Currently working"
        />
        <KPICard
          title="Recently Completed"
          value={stats?.completed ?? 0}
          icon={CheckCircle}
          color="green"
          subtitle="Done"
        />
      </div>

      {/* All Tasks Grouped by Event */}
      {tasks.length > 0 && (
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
                      checked={selectedItems.size === tasks.length && tasks.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
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
                {groupTasksByEvent(tasks).map(([eventId, eventTasks], eventIndex) => {
                  const bgColor = eventIndex % 2 === 0 ? PRIMARY_COLOR : SECONDARY_COLOR
                  const textColor = getTextColor(bgColor)

                  return eventTasks.map((task) => {
                    const dueDate = task.due_date || task.design_deadline
                    const daysUntil = getDaysUntil(dueDate)
                    const designerName = task.assigned_to_user
                      ? task.assigned_to_user.first_name && task.assigned_to_user.last_name
                        ? `${task.assigned_to_user.first_name} ${task.assigned_to_user.last_name}`
                        : task.assigned_to_user.email
                      : 'Unassigned'

                    return (
                      <tr
                        key={task.id}
                        className="cursor-pointer hover:opacity-90 transition-opacity text-sm"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor
                        }}
                      >
                        <td className="px-3 py-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.has(task.id)}
                            onChange={() => toggleItemSelection(task.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(task)}>
                          <div className="flex items-center">
                            {daysUntil !== null && daysUntil < 0 && (
                              <AlertCircle className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            )}
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && (
                              <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            )}
                            <span className="font-medium">{task.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-1">
                          {task.entity_type === 'event' && task.entity_id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigateToEvent(task.entity_id!)
                              }}
                              className="font-medium hover:underline inline-flex items-center"
                              style={{ color: textColor }}
                            >
                              {(task as any).event?.title || 'View Event'}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </button>
                          ) : (
                            <span className="text-sm opacity-70">-</span>
                          )}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(task)}>
                          {dueDate ? new Date(dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(task)}>
                          <div className="flex items-center">
                            {daysUntil === null ? (
                              <span>-</span>
                            ) : daysUntil < 0 ? (
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
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(task)}>
                          <div className="flex items-center">
                            <User className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            {designerName}
                          </div>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap" onClick={() => openTaskModal(task)}>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{
                            backgroundColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                          }}>
                            {task.status.replace('_', ' ').toUpperCase()}
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
      {tasks.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Palette className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Design Tasks Yet</h3>
          <p className="text-gray-600 mb-6">
            Design tasks will appear here when they are created
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
                    {selectedTask.title}
                  </span>
                </div>
                {selectedTask.entity_type === 'event' && selectedTask.entity_id && (
                  <div>
                    <span className="text-gray-600">Event:</span>
                    <button
                      onClick={() => {
                        closeTaskModal()
                        navigateToEvent(selectedTask.entity_id!)
                      }}
                      className="ml-2 font-medium text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                      View Event
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </button>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Assigned To:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedTask.assigned_to_user
                      ? selectedTask.assigned_to_user.first_name && selectedTask.assigned_to_user.last_name
                        ? `${selectedTask.assigned_to_user.first_name} ${selectedTask.assigned_to_user.last_name}`
                        : selectedTask.assigned_to_user.email
                      : 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Priority:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
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
                onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                aria-label="Task status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                style={{
                  '--tw-ring-color': PRIMARY_COLOR,
                  borderColor: 'rgb(209 213 219)'
                } as React.CSSProperties}
              >
                {TASK_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Notes
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
            {selectedTask.entity_type === 'event' && selectedTask.entity_id && (
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
                    entityId={selectedTask.entity_id}
                    onUploadComplete={() => {
                      toast.success('Design proof uploaded successfully')
                      setAttachmentRefreshKey(prev => prev + 1)
                    }}
                  />
                </div>
              </div>
            )}

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

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => {
          setIsAddTaskModalOpen(false)
          // Refresh data after adding a task - clear filters to show the new task
          // Then the user can re-apply filters if needed
          const fetchData = async () => {
            // Fetch without filters to ensure new task is visible
            const url = '/api/tasks/dashboard?taskType=design'
            const res = await fetch(url)
            if (res.ok) {
              const dashboardData: TaskDashboardData = await res.json()
              setTasks(dashboardData.tasks)
              setStats(dashboardData.stats)
              // Clear filters so the new task is visible
              setSelectedDesigner('')
              setSelectedStatus('')
            }
          }
          fetchData()
        }}
        departmentId="design"
        userId={currentUser?.id}
        primaryColor={PRIMARY_COLOR}
        defaultTaskType="design"
        hideTaskTypeSelector={true}
      />
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  title: string
  value: number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: 'yellow' | 'green' | 'red' | 'orange' | 'blue'
}

function KPICard({ title, value, subtitle, icon: Icon, color }: KPICardProps) {
  const colors: Record<KPICardProps['color'], string> = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
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
