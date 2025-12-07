'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { AppLayout } from '@/components/layout/app-layout'
import { TaskDetailModal } from '@/components/task-detail-modal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Search,
  ExternalLink
} from 'lucide-react'
import { getDepartmentById, type DepartmentId } from '@/lib/departments'
import toast from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('my-tasks')

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  status: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  department?: string
  assigned_to?: string
  entity_type?: string
  entity_id?: string
  created_at: string
  completed_at?: string
  // Event data from API join
  event?: {
    id: string
    title: string
    event_dates: Array<{ event_date: string }>
  }
}

interface EntityData {
  [key: string]: {
    name?: string
    title?: string
    event_type?: string
  }
}

const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: AlertCircle,
    order: 0
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertCircle,
    order: 1
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Clock,
    order: 2
  },
  low: {
    label: 'Low',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
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
  const router = useRouter()
  const { tenant } = useTenant()
  const [tasks, setTasks] = useState<Task[]>([])
  const [entityData, setEntityData] = useState<EntityData>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [filterDepartment, setFilterDepartment] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchMyTasks()
  }, [filterDepartment, filterPriority])

  const fetchMyTasks = async () => {
    try {
      setLoading(true)
      let url = '/api/tasks/my-tasks'
      const params = new URLSearchParams()
      
      if (filterDepartment) params.append('department', filterDepartment)
      if (filterPriority) params.append('priority', filterPriority)
      
      if (params.toString()) url += `?${params.toString()}`
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      
      const data = await res.json()
      const fetchedTasks = data.tasks || data || []
      setTasks(fetchedTasks)
      
      // Fetch entity data for all tasks
      await fetchEntityData(fetchedTasks)
    } catch (error) {
      log.error({ error }, 'Error fetching tasks')
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchEntityData = async (tasks: Task[]) => {
    const entityMap: EntityData = {}
    
    // Group tasks by entity type
    const eventIds = tasks.filter(t => t.entity_type === 'event' && t.entity_id).map(t => t.entity_id!)
    const opportunityIds = tasks.filter(t => t.entity_type === 'opportunity' && t.entity_id).map(t => t.entity_id!)
    
    // Fetch events
    if (eventIds.length > 0) {
      try {
        const uniqueEventIds = [...new Set(eventIds)]
        const eventPromises = uniqueEventIds.map(id => 
          fetch(`/api/events/${id}`).then(r => r.ok ? r.json() : null)
        )
        const events = await Promise.all(eventPromises)
        events.forEach((event, idx) => {
          if (event) {
            entityMap[uniqueEventIds[idx]] = {
              name: event.name || event.title,
              event_type: event.event_type
            }
          }
        })
      } catch (error) {
        log.error({ error }, 'Error fetching events')
      }
    }
    
    // Fetch opportunities
    if (opportunityIds.length > 0) {
      try {
        const uniqueOppIds = [...new Set(opportunityIds)]
        const oppPromises = uniqueOppIds.map(id => 
          fetch(`/api/opportunities/${id}`).then(r => r.ok ? r.json() : null)
        )
        const opportunities = await Promise.all(oppPromises)
        opportunities.forEach((opp, idx) => {
          if (opp) {
            entityMap[uniqueOppIds[idx]] = {
              title: opp.title,
              event_type: opp.event_type
            }
          }
        })
      } catch (error) {
        log.error({ error }, 'Error fetching opportunities')
      }
    }
    
    setEntityData(entityMap)
  }

  const handleToggleComplete = async (e: React.MouseEvent, taskId: string, currentStatus: string) => {
    e.stopPropagation() // Prevent opening modal
    
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
      log.error({ error }, 'Error updating task')
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

  const getTaskDisplayTitle = (task: Task) => {
    const parts = []

    // Use event data from API if available
    if (task.event) {
      parts.push(task.event.title)
    } else if (task.entity_id && entityData[task.entity_id]) {
      // Fallback to separately fetched entity data
      const entity = entityData[task.entity_id]
      if (entity.name || entity.title) {
        parts.push(entity.name || entity.title)
      }

      // Event Type
      if (entity.event_type) {
        parts.push(entity.event_type)
      }
    }

    // Task Title
    parts.push(task.title)

    return parts.join(' • ')
  }

  // Format event date for display
  const getEventDateDisplay = (task: Task): string | null => {
    if (task.event?.event_dates && task.event.event_dates.length > 0) {
      const date = new Date(task.event.event_dates[0].event_date)
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
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

  const handleOpenEntity = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation()
    if (task.entity_type === 'event' && task.entity_id) {
      router.push(`/${tenant}/events/${task.entity_id}`)
    } else if (task.entity_type === 'opportunity' && task.entity_id) {
      router.push(`/${tenant}/opportunities/${task.entity_id}`)
    }
  }

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

    // Filter by tab (active vs completed)
    if (activeTab === 'active') {
      filtered = filtered.filter(t => t.status !== 'completed')
    } else {
      filtered = filtered.filter(t => t.status === 'completed')
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task => {
        const displayTitle = getTaskDisplayTitle(task).toLowerCase()
        return displayTitle.includes(query) ||
               task.description?.toLowerCase().includes(query)
      })
    }

    // Sort by: due_date (asc), then entity_id (group by event), then priority
    return filtered.sort((a, b) => {
      // Completed tasks: sort by completed_at (most recent first)
      if (activeTab === 'completed') {
        if (!a.completed_at) return 1
        if (!b.completed_at) return -1
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      }

      // Active tasks: sort by due date → entity → priority
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      const dateCompare = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      if (dateCompare !== 0) return dateCompare

      const entityA = a.entity_id || ''
      const entityB = b.entity_id || ''
      if (entityA !== entityB) return entityA.localeCompare(entityB)

      const priorityA = PRIORITY_CONFIG[a.priority || 'low'].order
      const priorityB = PRIORITY_CONFIG[b.priority || 'low'].order
      return priorityA - priorityB
    })
  }, [tasks, activeTab, searchQuery, entityData])

  const activeTasks = tasks.filter(t => t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50 p-3">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-2">
              <div className="h-5 bg-gray-200 rounded w-40"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-3">
        <div className="max-w-6xl mx-auto space-y-3">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <ListTodo className="h-5 w-5 mr-2 text-blue-600" />
            My Tasks
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">What's next for you today</p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-2 space-y-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-2 py-0.5 text-xs border border-gray-300 rounded"
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
              className="px-2 py-0.5 text-xs border border-gray-300 rounded"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}>
          <TabsList className="w-full justify-start bg-white border-b border-gray-200 rounded-none h-auto p-0">
            <TabsTrigger 
              value="active" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-3 py-2 text-xs"
            >
              Active Tasks ({activeTasks.length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-3 py-2 text-xs"
            >
              Completed Tasks ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-2">
            <TaskList
              tasks={filteredTasks}
              searchQuery={searchQuery}
              onToggleComplete={handleToggleComplete}
              onOpenTask={setSelectedTask}
              onOpenEntity={handleOpenEntity}
              getDepartmentIcon={getDepartmentIcon}
              getDepartmentLabel={getDepartmentLabel}
              getTaskDisplayTitle={getTaskDisplayTitle}
              getDaysUntil={getDaysUntil}
              getEventDateDisplay={getEventDateDisplay}
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-2">
            <TaskList
              tasks={filteredTasks}
              searchQuery={searchQuery}
              onToggleComplete={handleToggleComplete}
              onOpenTask={setSelectedTask}
              onOpenEntity={handleOpenEntity}
              getDepartmentIcon={getDepartmentIcon}
              getDepartmentLabel={getDepartmentLabel}
              getTaskDisplayTitle={getTaskDisplayTitle}
              getDaysUntil={getDaysUntil}
              getEventDateDisplay={getEventDateDisplay}
            />
          </TabsContent>
        </Tabs>
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

// Separate component for task list to keep main component clean
function TaskList({
  tasks,
  searchQuery,
  onToggleComplete,
  onOpenTask,
  onOpenEntity,
  getDepartmentIcon,
  getDepartmentLabel,
  getTaskDisplayTitle,
  getDaysUntil,
  getEventDateDisplay
}: {
  tasks: Task[]
  searchQuery: string
  onToggleComplete: (e: React.MouseEvent, taskId: string, currentStatus: string) => void
  onOpenTask: (task: Task) => void
  onOpenEntity: (e: React.MouseEvent, task: Task) => void
  getDepartmentIcon: (deptId?: string) => any
  getDepartmentLabel: (deptId?: string) => string
  getTaskDisplayTitle: (task: Task) => string
  getDaysUntil: (dueDate: string) => number
  getEventDateDisplay: (task: Task) => string | null
}) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <ListTodo className="h-10 w-10 mx-auto text-gray-300 mb-2" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">No tasks found</h3>
        <p className="text-xs text-gray-600">
          {searchQuery ? "No tasks match your search" : "You're all caught up!"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {tasks.map(task => {
        const priorityConfig = PRIORITY_CONFIG[task.priority || 'low']
        const DeptIcon = getDepartmentIcon(task.department)
        const isCompleted = task.status === 'completed'
        const daysUntil = task.due_date ? getDaysUntil(task.due_date) : null
        const isOverdue = daysUntil !== null && daysUntil < 0 && !isCompleted

        return (
          <div
            key={task.id}
            onClick={() => onOpenTask(task)}
            className={`bg-white rounded shadow-sm hover:shadow transition-all p-1.5 cursor-pointer border border-transparent hover:border-blue-200 ${
              isCompleted ? 'opacity-40' : ''
            } ${isOverdue ? 'border-l-2 border-l-red-500' : ''}`}
          >
            <div className="flex items-center gap-2">
              {/* Complete Checkbox */}
              <button
                onClick={(e) => onToggleComplete(e, task.id, task.status)}
                className="flex-shrink-0"
                title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-300 hover:text-blue-600" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Task Title (Event • Task) */}
                    <h3 className={`text-xs font-medium text-gray-900 truncate ${isCompleted ? 'line-through' : ''}`}>
                      {getTaskDisplayTitle(task)}
                    </h3>

                    {/* Open Entity Link */}
                    {task.entity_id && (task.entity_type === 'event' || task.entity_type === 'opportunity') && (
                      <button
                        onClick={(e) => onOpenEntity(e, task)}
                        className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}

                    {/* Event Date Badge */}
                    {getEventDateDisplay(task) && (
                      <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                        <Calendar className="h-2.5 w-2.5 mr-0.5" />
                        {getEventDateDisplay(task)}
                      </span>
                    )}

                    {/* Department & Priority */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="flex items-center text-xs text-gray-600">
                        <DeptIcon className="h-3 w-3 mr-0.5" />
                        <span className="hidden sm:inline">{getDepartmentLabel(task.department)}</span>
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                        {priorityConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Due Date */}
                  {task.due_date && (
                    <div className="flex-shrink-0">
                      <div className={`flex items-center text-xs font-medium ${
                        isOverdue ? 'text-red-600' :
                        daysUntil !== null && daysUntil === 0 ? 'text-orange-600' :
                        daysUntil !== null && daysUntil <= 3 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        <Clock className="h-3 w-3 mr-0.5" />
                        <span className="text-xs">
                          {isOverdue && '⚠️ '}
                          {daysUntil === 0 ? 'Today' :
                           daysUntil === 1 ? 'Tomorrow' :
                           daysUntil === -1 ? 'Yesterday' :
                           daysUntil && daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` :
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
      })}
    </div>
  )
}
