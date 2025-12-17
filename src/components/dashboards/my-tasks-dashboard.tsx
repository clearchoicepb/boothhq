'use client'

/**
 * My Tasks Dashboard
 *
 * Personal task dashboard showing all tasks assigned to the current user
 * Displays tasks across all roles/departments in one unified view
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  ExternalLink,
  User,
  Briefcase,
  Loader2,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tasksService } from '@/lib/api/services/tasksService'
import { AddTaskModal } from '@/components/dashboards/add-task-modal'
import type { TaskWithRelations } from '@/types/tasks'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('dashboards')

// Brand color - same as used in other dashboards
const PRIMARY_COLOR = '#347dc4'

interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
  dueToday: number
  dueThisWeek: number
}

export function MyTasksDashboard() {
  const { data: session } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
  })
  
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Add task modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks()
    }
  }, [session, statusFilter, priorityFilter, departmentFilter])

  const fetchTasks = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      
      // Fetch all tasks assigned to current user
      const options: any = {
        assignedTo: session.user.id,
        sortBy: 'due_date',
        sortOrder: 'asc',
      }

      if (statusFilter !== 'all') options.status = statusFilter
      if (priorityFilter !== 'all') options.priority = priorityFilter
      if (departmentFilter !== 'all') options.department = departmentFilter

      const data = await tasksService.list(options)
      setTasks(data)

      // Calculate stats
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(today)
      endOfToday.setDate(endOfToday.getDate() + 1)
      const endOfWeek = new Date(today)
      endOfWeek.setDate(endOfWeek.getDate() + 7)

      const newStats: TaskStats = {
        total: data.length,
        pending: data.filter(t => t.status === 'pending').length,
        inProgress: data.filter(t => t.status === 'in_progress').length,
        completed: data.filter(t => t.status === 'completed').length,
        overdue: data.filter(t => {
          if (t.status === 'completed' || !t.due_date) return false
          return new Date(t.due_date) < today
        }).length,
        dueToday: data.filter(t => {
          if (t.status === 'completed' || !t.due_date) return false
          const dueDate = new Date(t.due_date)
          return dueDate >= today && dueDate < endOfToday
        }).length,
        dueThisWeek: data.filter(t => {
          if (t.status === 'completed' || !t.due_date) return false
          const dueDate = new Date(t.due_date)
          return dueDate >= today && dueDate < endOfWeek
        }).length,
      }

      setStats(newStats)
    } catch (error) {
      log.error({ error }, 'Error fetching tasks')
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (task: TaskWithRelations, newStatus: string) => {
    try {
      await tasksService.updateStatus(task.id, newStatus as any)
      toast.success('Task status updated')
      fetchTasks()
    } catch (error) {
      log.error({ error }, 'Error updating task')
      toast.error('Failed to update task')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-100 border-green-200'
      default: return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getDueDateStatus = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed') return null

    const now = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: 'Overdue', color: 'text-red-600' }
    if (diffDays === 0) return { text: 'Due Today', color: 'text-orange-600' }
    if (diffDays <= 7) return { text: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, color: 'text-yellow-600' }
    return { text: `Due in ${diffDays} days`, color: 'text-gray-600' }
  }

  const uniqueDepartments = Array.from(new Set(tasks.map(t => t.department).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#347dc4] mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-3 text-[#347dc4]" />
            My Tasks
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            All tasks assigned to you across all departments
          </p>
        </div>
        <Button
          onClick={() => setIsAddTaskModalOpen(true)}
          className="bg-[#347dc4] hover:bg-[#2a6aa8]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Briefcase className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">{stats.overdue}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Due This Week</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">{stats.dueThisWeek}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {uniqueDepartments.length > 1 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#347dc4]"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept || ''}>{dept}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">
            {statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters to see more tasks.'
              : 'You have no tasks assigned to you at the moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const dueDateStatus = getDueDateStatus(task.due_date, task.status)
            
            return (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-medium text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.department && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {task.department}
                        </span>
                      )}
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {task.due_date && dueDateStatus && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span className={dueDateStatus.color}>
                            {dueDateStatus.text}
                          </span>
                        </div>
                      )}
                      
                      {task.entity_type && task.entity_id && (
                        <button
                          onClick={() => router.push(`/${task.entity_type}s/${task.entity_id}`)}
                          className="flex items-center text-[#347dc4] hover:underline"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View {task.entity_type}
                        </button>
                      )}

                      {(task as any).auto_created && (
                        <span className="flex items-center text-purple-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Auto-created
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className={`
                        px-3 py-1 rounded-lg text-sm font-medium border
                        ${task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                        ${task.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                        ${task.status === 'pending' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                      `}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => {
          setIsAddTaskModalOpen(false)
          // Refresh tasks after adding
          fetchTasks()
        }}
        departmentId="sales" // Default department - user can select task category in modal
        userId={session?.user?.id}
        primaryColor={PRIMARY_COLOR}
      />
    </div>
  )
}

