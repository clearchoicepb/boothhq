import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { enrichTaskWithUrgency } from '@/types/tasks'
import type { TaskDashboardData, TaskWithRelations } from '@/types/tasks'
import { canAccessDepartment, type DepartmentId } from '@/lib/departments'
import { parseLocalDate } from '@/lib/utils/date-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:tasks')

// Event data structure for tasks linked to events
interface EventInfo {
  id: string
  title: string
  event_dates: Array<{ event_date: string }>
}

/**
 * GET /api/tasks/dashboard
 *
 * Returns dashboard data for a department including:
 * - List of tasks with urgency information
 * - Statistics (overdue, due today, due this week, etc.)
 *
 * Query params:
 * - department: Department ID (required)
 * - assignedTo: User ID to filter tasks (optional)
 *
 * Authorization:
 * - Managers can access all departments
 * - Supervisors can access their own department
 * - Members can access their own department
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const searchParams = request.nextUrl.searchParams
    const department = searchParams.get('department')
    const assignedTo = searchParams.get('assignedTo')

    if (!department) {
      return NextResponse.json(
        { error: 'Department is required' },
        { status: 400 }
      )
    }

    // Authorization check: Verify user can access this department
    // Fetch user's department and role from database (may not be in session JWT)
    const { data: userData } = await supabase
      .from('users')
      .select('department, department_role')
      .eq('id', session.user.id)
      .single()

    const userDepartment = userData?.department || null
    const userRole = userData?.department_role || 'member'
    const systemRole = session.user.role || null // From session JWT

    // Check if user has permission to access this department
    // Authorization hierarchy:
    // 1. System admins (admin, tenant_admin) can access ALL departments
    // 2. Department managers can access ALL departments
    // 3. Supervisors can access their own department
    // 4. Members can access their own department
    const hasAccess = canAccessDepartment(
      userDepartment as DepartmentId | null,
      userRole,
      department as DepartmentId,
      systemRole
    )

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: `You do not have permission to access the ${department} department dashboard. System role: ${systemRole || 'none'}, Department: ${userDepartment || 'none'}, Department role: ${userRole || 'none'}`
        },
        { status: 403 }
      )
    }

    // Build query for tasks
    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email),
        created_user:users!tasks_created_by_fkey(id, first_name, last_name, email)
      `
      )
      .eq('tenant_id', dataSourceTenantId)
      .eq('department', department)
      .in('status', ['pending', 'in_progress']) // Only show active tasks on dashboard

    // Filter by assignee if provided
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    // Order by due date (nulls last)
    query = query.order('due_date', { ascending: true, nullsFirst: false })

    const { data: tasks, error } = await query

    if (error) {
      log.error({ error }, '[GET /api/tasks/dashboard] Error')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch event data for tasks linked to events
    const eventTaskIds = (tasks || [])
      .filter(t => t.entity_type === 'event' && t.entity_id)
      .map(t => t.entity_id!)

    const uniqueEventIds = [...new Set(eventTaskIds)]
    const eventsMap: Record<string, EventInfo> = {}

    if (uniqueEventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, event_dates(event_date)')
        .eq('tenant_id', dataSourceTenantId)
        .in('id', uniqueEventIds)

      if (events) {
        events.forEach((event: EventInfo) => {
          eventsMap[event.id] = event
        })
      }
    }

    // Enrich tasks with urgency information and event data
    const tasksWithUrgency = (tasks || []).map(task => {
      const enriched = enrichTaskWithUrgency(task)
      // Attach event info if this task is linked to an event
      if (task.entity_type === 'event' && task.entity_id && eventsMap[task.entity_id]) {
        return {
          ...enriched,
          event: eventsMap[task.entity_id]
        }
      }
      return enriched
    })

    // Calculate statistics
    const stats = calculateStats(tasksWithUrgency)

    const dashboardData: TaskDashboardData = {
      tasks: tasksWithUrgency,
      stats,
    }

    return NextResponse.json(dashboardData)
  } catch (error: any) {
    log.error({ error }, '[GET /api/tasks/dashboard] Unexpected error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate dashboard statistics from tasks
 */
function calculateStats(tasks: TaskWithRelations[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const oneWeekFromNow = new Date(today)
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
  const oneMonthFromNow = new Date(today)
  oneMonthFromNow.setDate(oneMonthFromNow.getDate() + 30)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let overdue = 0
  let due_today = 0
  let due_this_week = 0
  let due_this_month = 0
  let completed_last_7_days = 0
  let total_pending = 0
  let total_in_progress = 0
  let total_completed = 0
  let total_cancelled = 0
  const by_priority = { low: 0, medium: 0, high: 0, urgent: 0 }
  const assigneeCounts: Record<string, number> = {}

  tasks.forEach((task) => {
    // Count by status
    if (task.status === 'pending') total_pending++
    if (task.status === 'in_progress') total_in_progress++
    if (task.status === 'completed') total_completed++
    if (task.status === 'cancelled') total_cancelled++

    // Count by priority
    if (task.priority && by_priority.hasOwnProperty(task.priority)) {
      by_priority[task.priority as keyof typeof by_priority]++
    }

    // Count by assignee
    if (task.assigned_to) {
      assigneeCounts[task.assigned_to] = (assigneeCounts[task.assigned_to] || 0) + 1
    }

    // Count completed in last 7 days
    if (task.status === 'completed' && task.completed_at) {
      const completedDate = new Date(task.completed_at)
      if (completedDate >= sevenDaysAgo) {
        completed_last_7_days++
      }
    }

    // Count by urgency (only for active tasks)
    if (task.status === 'pending' || task.status === 'in_progress') {
      if (!task.due_date) return

      // Use parseLocalDate to avoid timezone conversion issues
      const dueDate = parseLocalDate(task.due_date)
      dueDate.setHours(0, 0, 0, 0)

      if (dueDate < today) {
        overdue++
      } else if (dueDate.getTime() === today.getTime()) {
        due_today++
      } else if (dueDate < oneWeekFromNow) {
        due_this_week++
      } else if (dueDate < oneMonthFromNow) {
        due_this_month++
      }
    }
  })

  return {
    total: tasks.length,
    overdue,
    due_today,
    due_this_week,
    due_this_month,
    completed_last_7_days,
    pending: total_pending,
    in_progress: total_in_progress,
    completed: total_completed,
    cancelled: total_cancelled,
    by_priority,
    by_assignee: Object.entries(assigneeCounts).map(([user_id, count]) => ({
      user_id,
      user_name: '', // Name populated by frontend from user data
      count,
    })),
  }
}
