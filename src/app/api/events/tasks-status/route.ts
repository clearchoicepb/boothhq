import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
/**
 * GET /api/events/tasks-status
 * 
 * Returns task status for multiple events efficiently
 * Used for red dot indicators on event cards/rows
 */
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const eventIds = idsParam ? idsParam.split(',').filter(Boolean) : []

    if (eventIds.length === 0) {
      return NextResponse.json({ taskStatus: {} })
    }

    // Fetch incomplete tasks for these events
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, entity_id, due_date, status')
      .eq('entity_type', 'event')
      .in('entity_id', eventIds)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error fetching task status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate status for each event
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const taskStatus: Record<string, { 
      hasTasks: boolean
      isOverdue: boolean
      isDueSoon: boolean 
    }> = {}

    // Group tasks by event
    const tasksByEvent = (tasks || []).reduce((acc, task) => {
      if (!acc[task.entity_id]) acc[task.entity_id] = []
      acc[task.entity_id].push(task)
      return acc
    }, {} as Record<string, typeof tasks>)

    // Determine status for each event
    eventIds.forEach(eventId => {
      const eventTasks = tasksByEvent[eventId] || []
      
      if (eventTasks.length === 0) {
        taskStatus[eventId] = { hasTasks: false, isOverdue: false, isDueSoon: false }
        return
      }

      let hasOverdue = false
      let hasDueSoon = false

      eventTasks.forEach(task => {
        if (!task.due_date) return
        
        const dueDate = new Date(task.due_date)
        
        if (dueDate < now) {
          hasOverdue = true
        } else if (dueDate <= tomorrow) {
          hasDueSoon = true
        }
      })

      taskStatus[eventId] = {
        hasTasks: true,
        isOverdue: hasOverdue,
        isDueSoon: hasDueSoon || hasOverdue
      }
    })

    const response = NextResponse.json({ taskStatus })
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    console.error('Error in events tasks-status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

