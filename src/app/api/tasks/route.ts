import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isValidDepartmentId } from '@/lib/departments'

// GET - Fetch tasks with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)

    // Parse filters from query params
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const assignedTo = searchParams.get('assignedTo')
    const createdBy = searchParams.get('createdBy')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const department = searchParams.get('department')
    const taskType = searchParams.get('taskType')
    const dueDateFrom = searchParams.get('dueDateFrom')
    const dueDateTo = searchParams.get('dueDateTo')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query with relations
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date)
      `)
      .eq('tenant_id', dataSourceTenantId)

    // Apply filters
    if (entityType && entityId) {
      query = query.eq('entity_type', entityType).eq('entity_id', entityId)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    // Department filter (NEW)
    if (department && department !== 'all') {
      if (isValidDepartmentId(department)) {
        query = query.eq('department', department)
      }
    }

    // Task type filter (NEW)
    if (taskType) {
      query = query.eq('task_type', taskType)
    }

    // Date range filters (NEW)
    if (dueDateFrom) {
      query = query.gte('due_date', dueDateFrom)
    }

    if (dueDateTo) {
      query = query.lte('due_date', dueDateTo)
    }

    // Search filter (NEW) - searches in title and description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    if (sortBy === 'due_date') {
      // Sort by due_date, nulls last
      query = query.order('due_date', { ascending, nullsFirst: false })
    } else if (sortBy === 'priority') {
      // Custom priority order: urgent > high > medium > low
      // Since we can't do custom sort in Supabase, we'll sort by string
      query = query.order('priority', { ascending })
    } else {
      query = query.order(sortBy as any, { ascending })
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({
        error: 'Failed to fetch tasks',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json(tasks || [])
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body = await request.json()
    const {
      title,
      description,
      assignedTo,
      entityType,
      entityId,
      eventDateId,
      status = 'pending',
      priority = 'medium',
      dueDate,
      department,
      taskType,
    } = body

    if (!title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 })
    }

    // Import here to avoid circular dependency issues
    const { inferDepartmentFromEntity } = await import('@/lib/departments')

    // Auto-assign department if not provided
    // Priority: explicit department > infer from entity > user's department
    let taskDepartment = department
    if (!taskDepartment && entityType) {
      taskDepartment = inferDepartmentFromEntity(entityType)
    }
    if (!taskDepartment && session.user.department) {
      taskDepartment = session.user.department
    }

    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        tenant_id: dataSourceTenantId,
        title,
        description,
        assigned_to: assignedTo || null,
        created_by: session.user.id,
        entity_type: entityType || null,
        entity_id: entityId || null,
        event_date_id: eventDateId || null,
        status,
        priority,
        due_date: dueDate || null,
        department: taskDepartment || null,
        task_type: taskType || null,
      })
      .select(`
        *,
        assigned_to_user:users!tasks_assigned_to_fkey(id, first_name, last_name, email, department, department_role),
        created_by_user:users!tasks_created_by_fkey(id, first_name, last_name, email),
        event_date:event_dates!tasks_event_date_id_fkey(id, event_date)
      `)
      .single()

    if (createError) {
      console.error('Error creating task:', createError)
      return NextResponse.json({
        error: 'Failed to create task',
        details: createError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
