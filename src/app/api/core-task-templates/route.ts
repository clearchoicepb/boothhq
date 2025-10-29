import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - Fetch core task templates for the tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: templates, error } = await supabase
      .from('core_task_templates')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching core task templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json(templates || [])
  } catch (error) {
    console.error('Error in GET /api/core-task-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new core task template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { task_name, display_order } = body

    if (!task_name) {
      return NextResponse.json({ error: 'Task name is required' }, { status: 400 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: template, error } = await supabase
      .from('core_task_templates')
      .insert({
        tenant_id: session.user.tenantId,
        task_name,
        display_order: display_order || 0,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating core task template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error in POST /api/core-task-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update core task templates (bulk reorder or update)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templates } = body // Array of { id, task_name, display_order, is_active }

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json({ error: 'Templates array is required' }, { status: 400 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    // Update each template
    const updatePromises = templates.map(template =>
      supabase
        .from('core_task_templates')
        .update({
          task_name: template.task_name,
          display_order: template.display_order,
          is_active: template.is_active
        })
        .eq('id', template.id)
        .eq('tenant_id', session.user.tenantId)
    )

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Error updating core task templates:', errors)
      return NextResponse.json({ error: 'Failed to update templates' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/core-task-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
