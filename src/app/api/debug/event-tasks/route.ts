import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  // Get one event
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', session.user.tenantId)
    .limit(1)
    .single()

  if (!event) {
    return NextResponse.json({ message: 'No events found' })
  }

  // Get its task completions
  const { data: completions } = await supabase
    .from('event_core_task_completion')
    .select('*')
    .eq('event_id', event.id)
    .eq('tenant_id', session.user.tenantId)

  // Get core tasks
  const { data: coreTasks } = await supabase
    .from('core_task_templates')
    .select('*')
    .eq('tenant_id', session.user.tenantId)
    .eq('is_active', true)

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title
    },
    taskCompletions: completions || [],
    coreTasks: coreTasks || [],
    analysis: {
      totalCoreTasks: coreTasks?.length || 0,
      totalCompletions: completions?.length || 0,
      completedTasks: completions?.filter(c => c.is_completed).length || 0,
      incompleteTasks: completions?.filter(c => !c.is_completed).length || 0,
      missingCompletionRecords: (coreTasks?.length || 0) - (completions?.length || 0)
    }
  })
}
