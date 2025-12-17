import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isValidDepartmentId } from '@/lib/departments'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:task-templates')

/**
 * GET /api/task-templates
 *
 * Fetch all task templates for the tenant with optional filters.
 * Only returns templates that belong to the current tenant.
 *
 * Query params:
 * - department: Filter by department ID
 * - task_type: Filter by unified task type (general, design, operations, etc.)
 * - enabled: Filter by enabled status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    const department = searchParams.get('department')
    const taskType = searchParams.get('task_type')
    const enabled = searchParams.get('enabled')

    let query = supabase
      .from('task_templates')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('department')
      .order('display_order')

    // Apply department filter
    if (department) {
      if (!isValidDepartmentId(department)) {
        return NextResponse.json(
          { error: 'Invalid department ID' },
          { status: 400 }
        )
      }
      query = query.eq('department', department)
    }

    // Apply task_type filter (unified task type)
    if (taskType) {
      query = query.eq('task_type', taskType)
    }

    // Apply enabled filter
    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true')
    }

    const { data, error } = await query

    if (error) {
      log.error({ error }, 'Error fetching task templates')
      return NextResponse.json(
        { error: 'Failed to fetch task templates', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    log.error({ error }, 'Error in GET /api/task-templates')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/task-templates
 *
 * Create a new task template.
 * Only admins and tenant_admins can create templates.
 *
 * Request body:
 * {
 *   name: string
 *   description?: string
 *   department: string
 *   task_type?: string
 *   default_title: string
 *   default_description?: string
 *   default_priority?: 'low' | 'medium' | 'high' | 'urgent'
 *   default_due_in_days?: number
 *   requires_assignment?: boolean
 *   enabled?: boolean
 *   display_order?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Authorization check - only admins can create templates
    if (session.user.role !== 'admin' && session.user.role !== 'tenant_admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can create task templates.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      department,
      task_type,
      default_title,
      default_description,
      default_priority = 'medium',
      default_due_in_days,
      requires_assignment = false,
      enabled = true,
      display_order = 0,
    } = body

    // Validation
    if (!name || !department || !default_title) {
      return NextResponse.json(
        { error: 'Missing required fields: name, department, default_title' },
        { status: 400 }
      )
    }

    if (!isValidDepartmentId(department)) {
      return NextResponse.json(
        { error: 'Invalid department ID' },
        { status: 400 }
      )
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (!validPriorities.includes(default_priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be: low, medium, high, or urgent' },
        { status: 400 }
      )
    }

    // Create template
    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        tenant_id: dataSourceTenantId,
        name,
        description: description || null,
        department,
        task_type: task_type || null,
        default_title,
        default_description: default_description || null,
        default_priority,
        default_due_in_days: default_due_in_days || null,
        requires_assignment,
        enabled,
        display_order,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error creating task template')
      return NextResponse.json(
        { error: 'Failed to create task template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, template: data })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/task-templates')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
