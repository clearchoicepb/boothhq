'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { TaskDetailModal } from '@/components/task-detail-modal'
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
  Settings as SettingsIcon,
  Search
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
  assigned_to?: string
  entity_type?: string // 'event', 'opportunity', 'account', 'contact', 'lead', 'invoice'
  entity_id?: string
  created_at: string
  completed_at?: string
}

const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: AlertCircle,
    order: 0
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: AlertCircle,
    order: 1
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: Clock,
    order: 2
  },
  low: {
    label: 'Low',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: Circle,
    order: 3
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
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchMyTasks()
  }, [filterStatus, filterDepartment, filterPriority])

  const fetchMyTasks = async () => {
    try {
      setLoading(true)
      let url = '/api/tasks/my-tasks'
      const params = new URLSearchParams()
      
      if (filterStatus) params.append('status', filterStatus)
      if (filterDepartment) params.append('department', filterDepartment)
      if (filterPriority) params.append('priority', filterPriority)
      
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
    if (!task.entity_type) return null
    const type = task.entity_type.charAt(0).toUpperCase() + task.entity_type.slice(1)
    return { label: task.entity_id || 'Unknown', type }
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

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.entity_type?.toLowerCase().includes(query)
      )
    }

    // Sort by: due_date (asc), then entity_id (group by event), then priority
    return filtered.sort((a, b) => {
      // First: Sort by due date
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      if (dateCompare !== 0) return dateCompare

      // Second: Group by entity_id (events together)
      const entityA = a.entity_id || ''
      const entityB = b.entity_id || ''
      if (entityA !== entityB) return entityA.localeCompare(entityB)

      // Third: Sort by priority within same event
      const priorityA = PRIORITY_CONFIG[a.priority || 'low'].order
      const priorityB = PRIORITY_CONFIG[b.priority || 'low'].order
      return priorityA - priorityB
    })
  }, [tasks, searchQuery])

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ListTodo className="h-6 w-6 mr-2 text-blue-600" />
            My Tasks
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">What's next for you today</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow p-3 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="">All Status</option>
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="">All Departments</option>
              <option value="sales">Sales</option>
              <option value="design">Design</option>
              <option value="operations">Operations</option>
              <option value="customer_success">Customer Success</option>
              <option value="accounting">Accounting</option>
              <option value="admin">Administration</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <span className="ml-auto text-xs text-gray-600">
              {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-1">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <ListTodo className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-1">No tasks found</h3>
              <p className="text-sm text-gray-600">
                {searchQuery ? "No tasks match your search" :
                 filterStatus === 'completed' ? "You haven't completed any tasks yet" :
                 "You're all caught up!"}
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
                  onClick={() => setSelectedTask(task)}
                  className={`bg-white rounded shadow-sm hover:shadow transition-shadow p-2 cursor-pointer ${
                    isCompleted ? 'opacity-50' : ''
                  } ${isOverdue ? 'border-l-2 border-red-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Complete Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleComplete(task.id, task.status)
                      }}
                      className="flex-shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300 hover:text-blue-600" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium text-gray-900 truncate ${isCompleted ? 'line-through' : ''}`}>
                            {task.title}
                          </h3>
                          
                          {/* Metadata Row */}
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
                            {/* Entity */}
                            {entity && (
                              <span className="flex items-center">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {entity.type}
                              </span>
                            )}
                            
                            {/* Department */}
                            <span className="flex items-center">
                              <DeptIcon className="h-3 w-3 mr-1" />
                              {getDepartmentLabel(task.department)}
                            </span>
                            
                            {/* Priority Badge */}
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                              {priorityConfig.label}
                            </span>
                          </div>
                        </div>

                        {/* Due Date */}
                        {task.due_date && (
                          <div className="flex-shrink-0 text-right">
                            <div className={`flex items-center text-xs font-medium ${
                              isOverdue ? 'text-red-600' : 
                              daysUntil !== null && daysUntil === 0 ? 'text-orange-600' :
                              daysUntil !== null && daysUntil <= 3 ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                {isOverdue && '⚠️ '}
                                {daysUntil === 0 ? 'Today' :
                                 daysUntil === 1 ? 'Tomorrow' :
                                 daysUntil === -1 ? 'Yesterday' :
                                 daysUntil && daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` :
                                 daysUntil && daysUntil > 0 ? `${daysUntil}d` :
                                 ''}
                              </span>
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask as any}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            fetchMyTasks()
            setSelectedTask(null)
          }}
          onDelete={() => {
            fetchMyTasks()
            setSelectedTask(null)
          }}
        />
      )}
    </AppLayout>
  )
}
