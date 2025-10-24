import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

/**
 * GET /api/opportunities/tasks-status
 * 
 * Returns task status for multiple opportunities efficiently
 * Used to show red dot indicators on pipeline cards and table rows
 * 
 * Query Parameters:
 * - ids: Comma-separated opportunity IDs
 * 
 * Returns:
 * {
 *   taskStatus: {
 *     [opportunityId]: {
 *       hasTasks: boolean,
 *       isOverdue: boolean,
 *       isDueSoon: boolean
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    const opportunityIds = idsParam ? idsParam.split(',').filter(Boolean) : []

    if (opportunityIds.length === 0) {
      return NextResponse.json({ taskStatus: {} })
    }

    const supabase = createServerSupabaseClient()

    // Fetch incomplete tasks for these opportunities
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, entity_id, due_date, status')
      .eq('entity_type', 'opportunity')
      .in('entity_id', opportunityIds)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error fetching task status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate status for each opportunity
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const taskStatus: Record<string, { 
      hasTasks: boolean
      isOverdue: boolean
      isDueSoon: boolean 
    }> = {}

    // Group tasks by opportunity
    const tasksByOpportunity = (tasks || []).reduce((acc, task) => {
      if (!acc[task.entity_id]) acc[task.entity_id] = []
      acc[task.entity_id].push(task)
      return acc
    }, {} as Record<string, typeof tasks>)

    // Determine status for each opportunity
    opportunityIds.forEach(oppId => {
      const oppTasks = tasksByOpportunity[oppId] || []
      
      if (oppTasks.length === 0) {
        taskStatus[oppId] = { hasTasks: false, isOverdue: false, isDueSoon: false }
        return
      }

      let hasOverdue = false
      let hasDueSoon = false

      oppTasks.forEach(task => {
        if (!task.due_date) return
        
        const dueDate = new Date(task.due_date)
        
        if (dueDate < now) {
          hasOverdue = true
        } else if (dueDate <= tomorrow) {
          hasDueSoon = true
        }
      })

      taskStatus[oppId] = {
        hasTasks: true,
        isOverdue: hasOverdue,
        isDueSoon: hasDueSoon || hasOverdue // Show indicator for both
      }
    })

    const response = NextResponse.json({ taskStatus })
    
    // Short cache - tasks change frequently
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    console.error('Error in tasks-status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

