import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

// POST - Initialize core task completions for an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: eventId } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    // Get all active core task templates for this tenant
    const { data: templates, error: templatesError } = await supabase
      .from('core_task_templates')
      .select('id')
      .eq('tenant_id', session.user.tenantId)
      .eq('is_active', true)

    if (templatesError) {
      console.error('Error fetching core task templates:', templatesError)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ message: 'No active core task templates found' }, { status: 200 })
    }

    // Create completion records for each template
    const completions = templates.map(template => ({
      tenant_id: session.user.tenantId,
      event_id: eventId,
      core_task_template_id: template.id,
      is_completed: false
    }))

    const { error: insertError } = await supabase
      .from('event_core_task_completion')
      .insert(completions)

    if (insertError) {
      console.error('Error initializing core tasks:', insertError)
      return NextResponse.json({ error: 'Failed to initialize core tasks' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Core tasks initialized successfully' })
  } catch (error) {
    console.error('Error in POST /api/events/[id]/core-tasks/initialize:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
