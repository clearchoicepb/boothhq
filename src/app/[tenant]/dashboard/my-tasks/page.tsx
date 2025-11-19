'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Filter,
  ListTodo,
  AlertCircle,
  Briefcase,
  Palette,
  TrendingUp,
  Users,
  DollarSign,
  Settings as SettingsIcon
} from 'lucide-react'
import { getDepartmentById, type DepartmentId } from '@/lib/departments'
import toast from 'react-hot-toast'

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  status: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  department?: string
  assigned_to_user_id?: string
  event_id?: string
  opportunity_id?: string
  account_id?: string
  contact_id?: string
  created_at: string
  completed_at?: string
  event?: {
    id: string
    title: string
    name?: string
  }
  opportunity?: {
    id: string
    title: string
  }
  account?: {
    id: string
    name: string
  }
  contact?: {
    id: string
    first_name: string
    last_name: string
  }
}

const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: AlertCircle
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: AlertCircle
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: Clock
  },
  low: {
    label: 'Low',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Circle
  }
}

const DEPARTMENT_ICONS: Record<string, any> = {
  sales: TrendingUp,
  design: Palette,
  operations: Briefcase,
  customer_success: Users,
  accounting: DollarSign,
  admin: SettingsIcon
}

export default function MyTasksPage() {
  const params = useParams()
  const { tenant } = useTenant()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date')

  useEffect(() => {
    fetchMyTasks()
  }, [filterStatus, filterDepartment, filterPriority, sortBy])

  const fetchMyTasks = async () => {
    try {
      setLoading(true)
      let url = '/api/tasks/my-tasks'
      const params = new URLSearchParams()
      
      if (filterStatus) params.append('status', filterStatus)
      if (filterDepartment) params.append('department', filterDepartment)
      if (filterPriority) params.append('priority', filterPriority)
      if (sortBy) params.append('sortBy', sortBy)
      
      if (params.toString()) url += `?${params.toString()}`
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      
      const data = await res.json()
      setTasks(data.tasks || data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed'
      
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
      })
      
      if (!res.ok) throw new Error('Failed to update task')
      
      toast.success(newStatus === 'completed' ? 'Task completed!' : 'Task reopened')
      fetchMyTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const getDaysUntil = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getEntityLabel = (task: Task) => {
    if (task.event) return { label: task.event.title || task.event.name || 'Event', type: 'Event' }
    if (task.opportunity) return { label: task.opportunity.title, type: 'Opportunity' }
    if (task.account) return { label: task.account.name, type: 'Account' }
    if (task.contact) return { label: `${task.contact.first_name} ${task.contact.last_name}`, type: 'Contact' }
    return null
  }

  const getDepartmentLabel = (deptId?: string) => {
    if (!deptId) return 'General'
    try {
      const dept = getDepartmentById(deptId as DepartmentId)
      return dept.name
    } catch {
      return deptId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getDepartmentIcon = (deptId?: string) => {
    if (!deptId) return ListTodo
    return DEPARTMENT_ICONS[deptId] || ListTodo
  }

  const filteredAndSortedTasks = tasks.sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (sortBy === 'priority') {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      return (priorityOrder[a.priority || 'low'] || 3) - (priorityOrder[b.priority || 'low'] || 3)
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ListTodo className="h-8 w-8 mr-3 text-blue-600" />
            My Tasks
          </h1>
          <p className="text-gray-600 mt-1">What's next for you today</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-gray-400" />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="active">Active Tasks</option>
              <option value="completed">Completed</option>
              <option value="">All Status</option>
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Departments</option>
              <option value="sales">Sales</option>
              <option value="design">Design & Creative</option>
              <option value="operations">Operations</option>
              <option value="customer_success">Customer Success</option>
              <option value="accounting">Accounting</option>
              <option value="admin">Administration</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md ml-auto"
            >
              <option value="due_date">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="created_at">Sort by Created Date</option>
            </select>
          </div>
        </div>

        {/* Task Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <ListTodo className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">
                {filterStatus === 'completed' 
                  ? "You haven't completed any tasks yet"
                  : "You're all caught up! No tasks to show."}
              </p>
            </div>
          ) : (
            filteredAndSortedTasks.map(task => {
              const entity = getEntityLabel(task)
              const priorityConfig = PRIORITY_CONFIG[task.priority || 'low']
              const DeptIcon = getDepartmentIcon(task.department)
              const isCompleted = task.status === 'completed'
              const daysUntil = task.due_date ? getDaysUntil(task.due_date) : null
              const isOverdue = daysUntil !== null && daysUntil < 0 && !isCompleted

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 ${
                    isCompleted ? 'opacity-60' : ''
                  } ${isOverdue ? 'border-l-4 border-red-500' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Complete Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(task.id, task.status)}
                      className="flex-shrink-0 mt-1"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-300 hover:text-blue-600" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-medium text-gray-900 ${isCompleted ? 'line-through' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                          )}
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {/* Entity */}
                            {entity && (
                              <span className="text-xs text-gray-600 flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {entity.type}: {entity.label}
                              </span>
                            )}
                            
                            {/* Department */}
                            <span className="text-xs text-gray-600 flex items-center">
                              <DeptIcon className="h-3 w-3 mr-1" />
                              {getDepartmentLabel(task.department)}
                            </span>
                            
                            {/* Priority */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Due Date */}
                        {task.due_date && (
                          <div className="text-right flex-shrink-0">
                            <div className={`flex items-center text-sm ${
                              isOverdue ? 'text-red-600 font-medium' : 
                              daysUntil !== null && daysUntil === 0 ? 'text-orange-600 font-medium' :
                              daysUntil !== null && daysUntil <= 3 ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>
                                {isOverdue && '⚠️ '}
                                {daysUntil === 0 ? 'Today' :
                                 daysUntil === 1 ? 'Tomorrow' :
                                 daysUntil === -1 ? 'Yesterday' :
                                 daysUntil && daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                 daysUntil && daysUntil > 0 ? `${daysUntil} days` :
                                 ''}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        </div>
      </div>
    </AppLayout>
  )
}
