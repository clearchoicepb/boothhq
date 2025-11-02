'use client'

/**
 * Unified Task Dashboard Component
 *
 * Reusable dashboard for ANY department's tasks
 * Uses Week 1 architecture: service layer, hooks, React Query
 *
 * UI patterns inspired by design-dashboard.tsx but rebuilt with SOLID principles
 *
 * Features:
 * - Department filtering
 * - KPI cards (overdue, today, this week, etc.)
 * - Task list with grouping
 * - Task detail modal
 * - Status updates with optimistic UI
 * - Works for all departments
 */

import { useState, useMemo } from 'react'
import { useTenant } from '@/lib/tenant-context'
import { useSettings } from '@/lib/settings-context'
import { useRouter } from 'next/navigation'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Filter,
  User,
  X,
  Save,
  ExternalLink,
  ListTodo,
  AlertTriangle,
  TrendingUp,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { AddTaskModal } from '@/components/dashboards/add-task-modal'

// Week 1 Architecture - Use hooks and services
import { useTaskDashboard } from '@/hooks/useTaskDashboard'
import { useUpdateTask } from '@/hooks/useTaskActions'
import { DEPARTMENTS, type DepartmentId } from '@/lib/departments'
import type { TaskWithUrgency } from '@/types/tasks'

export interface UnifiedTaskDashboardProps {
  /** Department to show tasks for. If null, shows all departments */
  departmentId?: DepartmentId | null

  /** User ID to filter tasks. If provided, shows only this user's tasks */
  userId?: string

  /** Show department tabs for switching between departments */
  showDepartmentTabs?: boolean

  /** Title override */
  title?: string

  /** Subtitle override */
  subtitle?: string
}

/**
 * Unified Task Dashboard
 *
 * @example
 * // Show all design tasks
 * <UnifiedTaskDashboard departmentId="design" />
 *
 * @example
 * // Show my tasks across all departments
 * <UnifiedTaskDashboard userId={session.user.id} showDepartmentTabs />
 *
 * @example
 * // Show all tasks for supervision
 * <UnifiedTaskDashboard showDepartmentTabs />
 */
export function UnifiedTaskDashboard({
  departmentId: initialDepartmentId = null,
  userId,
  showDepartmentTabs = false,
  title,
  subtitle,
}: UnifiedTaskDashboardProps) {
  const { tenant } = useTenant()
  const router = useRouter()
  const { getSetting } = useSettings()

  // State
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | null>(initialDepartmentId)
  const [selectedAssignee, setSelectedAssignee] = useState<string>(userId || 'all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'urgency' | 'priority' | 'status' | 'assignee'>('urgency')
  const [selectedTask, setSelectedTask] = useState<TaskWithUrgency | null>(null)
  const [taskStatus, setTaskStatus] = useState('')
  const [taskPriority, setTaskPriority] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)

  // Get tenant colors from settings
  const PRIMARY_COLOR = getSetting('appearance.primaryColor', '#347dc4')
  const SECONDARY_COLOR = getSetting('appearance.secondaryColor', '#8b5cf6')

  // Week 1 Architecture - Use hooks instead of direct fetch
  const { data: dashboardData, isLoading } = useTaskDashboard(
    selectedDepartment,
    selectedAssignee === 'all' ? undefined : selectedAssignee
  )

  const { updateTask, isPending: isUpdating } = useUpdateTask()

  // Get department info
  const departmentInfo = selectedDepartment ? DEPARTMENTS[selectedDepartment as DepartmentId] : null

  // Compute display title/subtitle
  const displayTitle = title || (departmentInfo ? `${departmentInfo.name} Tasks` : 'All Tasks')
  const displaySubtitle = subtitle || (departmentInfo ? departmentInfo.description : 'Unified task management across all departments')

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    if (!dashboardData?.tasks) return []

    return dashboardData.tasks.filter((task) => {
      // Status filter
      if (selectedStatus !== 'all' && task.status !== selectedStatus) return false

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false

      return true
    })
  }, [dashboardData?.tasks, selectedStatus, selectedPriority])

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskWithUrgency[]> = {}

    filteredTasks.forEach((task) => {
      let key: string

      switch (groupBy) {
        case 'urgency':
          key = task.urgency || 'no_due_date'
          break
        case 'priority':
          key = task.priority || 'medium'
          break
        case 'status':
          key = task.status || 'pending'
          break
        case 'assignee':
          key = task.assigned_to || 'unassigned'
          break
        default:
          key = 'other'
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    })

    return groups
  }, [filteredTasks, groupBy])

  // Task modal handlers
  const openTaskModal = (task: TaskWithUrgency) => {
    setSelectedTask(task)
    setTaskStatus(task.status || 'pending')
    setTaskPriority(task.priority || 'medium')
    setTaskNotes('')
  }

  const closeTaskModal = () => {
    setSelectedTask(null)
    setTaskStatus('')
    setTaskPriority('')
    setTaskNotes('')
  }

  const saveTaskUpdates = async () => {
    if (!selectedTask) return

    try {
      // Use Week 1 hooks for updates
      await updateTask({
        taskId: selectedTask.id,
        updates: {
          status: taskStatus as any,
          priority: taskPriority as any,
          // Notes would be added to task_comments table in the future
        },
      })

      toast.success('Task updated successfully')
      closeTaskModal()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  // Navigate to entity
  const navigateToEntity = (entityType: string, entityId: string) => {
    const routes: Record<string, string> = {
      event: 'events',
      opportunity: 'opportunities',
      account: 'accounts',
      contact: 'contacts',
    }

    const route = routes[entityType] || entityType
    router.push(`/${tenant}/${route}/${entityId}`)
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedAssignee(userId || 'all')
    setSelectedStatus('all')
    setSelectedPriority('all')
  }

  const hasFilters = selectedAssignee !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all'

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  const stats = dashboardData.stats || {
    total: 0,
    overdue: 0,
    due_today: 0,
    due_this_week: 0,
    due_this_month: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ListTodo className="h-8 w-8 mr-3" style={{ color: PRIMARY_COLOR }} />
            {displayTitle}
          </h1>
          <p className="text-gray-600 mt-1">{displaySubtitle}</p>
        </div>

        {/* Add Task Button - Only show if we have a specific department */}
        {selectedDepartment && (
          <button
            onClick={() => setIsAddTaskModalOpen(true)}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity inline-flex items-center"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Task
          </button>
        )}
      </div>

      {/* Department Tabs (if enabled) */}
      {showDepartmentTabs && (
        <div className="bg-white rounded-lg shadow-md p-2 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedDepartment(null)}
            className={`px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              selectedDepartment === null
                ? 'text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            style={selectedDepartment === null ? { backgroundColor: PRIMARY_COLOR } : {}}
          >
            All Departments
          </button>
          {Object.values(DEPARTMENTS).map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={`px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                selectedDepartment === dept.id
                  ? 'text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={selectedDepartment === dept.id ? { backgroundColor: dept.color } : {}}
            >
              {dept.abbreviation}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-4">
        <Filter className="h-5 w-5 text-gray-400" />

        {!userId && (
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            aria-label="Filter by assignee"
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {/* TODO: Load users from tenant */}
          </select>
        )}

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          aria-label="Filter by priority"
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as any)}
          aria-label="Group by"
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
        >
          <option value="urgency">Group by Urgency</option>
          <option value="priority">Group by Priority</option>
          <option value="status">Group by Status</option>
          <option value="assignee">Group by Assignee</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm font-medium hover:opacity-80 transition-opacity flex items-center"
            style={{ color: PRIMARY_COLOR }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Overdue"
          value={stats.overdue || 0}
          icon={AlertCircle}
          color="red"
          subtitle="Past due date"
        />
        <KPICard
          title="Due Today"
          value={stats.due_today || 0}
          icon={AlertTriangle}
          color="orange"
          subtitle="Needs attention today"
        />
        <KPICard
          title="Due This Week"
          value={stats.due_this_week || 0}
          icon={Calendar}
          color="yellow"
          subtitle="Coming up soon"
        />
        <KPICard
          title="Due This Month"
          value={stats.due_this_month || 0}
          icon={TrendingUp}
          color="blue"
          subtitle="Within 30 days"
        />
      </div>

      {/* Task List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedTasks).map(([group, tasks]) => (
            <div key={group} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-bold text-gray-900 capitalize">
                  {group.replace(/_/g, ' ')} ({tasks.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Related To
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Assignee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onClick={() => openTaskModal(task)}
                        onEntityClick={(type, id) => navigateToEntity(type, id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          departmentName={departmentInfo?.name}
          onNavigate={() => router.push(`/${tenant}/events`)}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={closeTaskModal}
          taskStatus={taskStatus}
          setTaskStatus={setTaskStatus}
          taskPriority={taskPriority}
          setTaskPriority={setTaskPriority}
          taskNotes={taskNotes}
          setTaskNotes={setTaskNotes}
          onSave={saveTaskUpdates}
          saving={isUpdating}
          primaryColor={PRIMARY_COLOR}
          onNavigateToEntity={navigateToEntity}
        />
      )}

      {/* Add Task Modal */}
      {selectedDepartment && (
        <AddTaskModal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          departmentId={selectedDepartment}
          userId={userId}
          primaryColor={PRIMARY_COLOR}
        />
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
  color: 'yellow' | 'green' | 'red' | 'orange' | 'purple' | 'blue'
}

function KPICard({ title, value, subtitle, icon: Icon, color }: KPICardProps) {
  const colors: Record<KPICardProps['color'], string> = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
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

// Task Row Component
interface TaskRowProps {
  task: TaskWithUrgency
  onClick: () => void
  onEntityClick: (entityType: string, entityId: string) => void
}

function TaskRow({ task, onClick, onEntityClick }: TaskRowProps) {
  const getUrgencyBadge = (urgency: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'OVERDUE' },
      today: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'TODAY' },
      this_week: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'THIS WEEK' },
      this_month: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'THIS MONTH' },
      future: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'FUTURE' },
      no_due_date: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'NO DATE' },
    }

    const badge = badges[urgency] || badges.no_due_date
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      urgent: { bg: 'bg-red-100', text: 'text-red-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      low: { bg: 'bg-gray-100', text: 'text-gray-800' },
    }

    const badge = badges[priority] || badges.medium
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-800' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    }

    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    )
  }

  return (
    <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={onClick}>
      <td className="px-6 py-4">
        <div className="flex items-center">
          {task.urgency === 'overdue' && <AlertCircle className="h-4 w-4 mr-2 text-red-600" />}
          {task.urgency === 'today' && <Clock className="h-4 w-4 mr-2 text-orange-600" />}
          <div>
            <div className="font-medium text-gray-900">{task.title}</div>
            {task.description && (
              <div className="text-sm text-gray-500 truncate max-w-md">{task.description}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {task.entity_type && task.entity_id ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEntityClick(task.entity_type!, task.entity_id!)
            }}
            className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
          >
            {task.entity_type}
            <ExternalLink className="h-3 w-3 ml-1" />
          </button>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        {task.due_date ? (
          <div>
            <div>{new Date(task.due_date).toLocaleDateString()}</div>
            {task.urgency && <div className="mt-1">{getUrgencyBadge(task.urgency)}</div>}
          </div>
        ) : (
          <span className="text-gray-500">No due date</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-gray-400" />
          {task.assigned_to || 'Unassigned'}
        </div>
      </td>
      <td className="px-6 py-4">{getPriorityBadge(task.priority || 'medium')}</td>
      <td className="px-6 py-4">{getStatusBadge(task.status || 'pending')}</td>
    </tr>
  )
}

// Empty State Component
interface EmptyStateProps {
  departmentName?: string
  onNavigate: () => void
}

function EmptyState({ departmentName, onNavigate }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-12 text-center">
      <ListTodo className="h-16 w-16 mx-auto text-gray-400 mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No {departmentName || ''} Tasks Yet
      </h3>
      <p className="text-gray-600 mb-6">
        Tasks will appear here when they are created or assigned
      </p>
      <button
        onClick={onNavigate}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Events
      </button>
    </div>
  )
}

// Task Detail Modal Component
interface TaskDetailModalProps {
  task: TaskWithUrgency
  isOpen: boolean
  onClose: () => void
  taskStatus: string
  setTaskStatus: (status: string) => void
  taskPriority: string
  setTaskPriority: (priority: string) => void
  taskNotes: string
  setTaskNotes: (notes: string) => void
  onSave: () => void
  saving: boolean
  primaryColor: string
  onNavigateToEntity: (entityType: string, entityId: string) => void
}

function TaskDetailModal({
  task,
  isOpen,
  onClose,
  taskStatus,
  setTaskStatus,
  taskPriority,
  setTaskPriority,
  taskNotes,
  setTaskNotes,
  onSave,
  saving,
  primaryColor,
  onNavigateToEntity,
}: TaskDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details">
      <div className="space-y-6">
        {/* Task Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Task Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Title:</span>
              <span className="ml-2 font-medium text-gray-900">{task.title}</span>
            </div>
            {task.description && (
              <div>
                <span className="text-gray-600">Description:</span>
                <p className="mt-1 text-gray-900">{task.description}</p>
              </div>
            )}
            {task.entity_type && task.entity_id && (
              <div>
                <span className="text-gray-600">Related To:</span>
                <button
                  onClick={() => {
                    onClose()
                    onNavigateToEntity(task.entity_type!, task.entity_id!)
                  }}
                  className="ml-2 font-medium text-blue-600 hover:text-blue-800 inline-flex items-center"
                >
                  {task.entity_type}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </button>
              </div>
            )}
            {task.due_date && (
              <div>
                <span className="text-gray-600">Due Date:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.department && (
              <div>
                <span className="text-gray-600">Department:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {DEPARTMENTS[task.department as DepartmentId]?.name || task.department}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Update */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={taskStatus}
            onChange={(e) => setTaskStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Priority Update */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Add Notes</label>
          <Textarea
            value={taskNotes}
            onChange={(e) => setTaskNotes(e.target.value)}
            placeholder="Add any notes or updates about this task..."
            rows={4}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-opacity"
            style={{ backgroundColor: primaryColor }}
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
  )
}
