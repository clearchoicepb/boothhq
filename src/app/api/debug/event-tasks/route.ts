import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
export async function GET() {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  // Get one event
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', dataSourceTenantId)
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
    .eq('tenant_id', dataSourceTenantId)

  // Get core tasks
  const { data: coreTasks } = await supabase
    .from('core_task_templates')
    .select('*')
    .eq('tenant_id', dataSourceTenantId)
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
