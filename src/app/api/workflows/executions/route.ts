/**
 * Workflow Executions API
 *
 * GET: Fetch workflow execution history
 * Query params:
 * - workflowId: Filter by specific workflow
 * - limit: Number of results (default 20, max 100)
 * - status: Filter by status (completed, failed, partial, skipped)
 * - startDate: Filter executions after this date
 * - endDate: Filter executions before this date
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:workflows')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)

    // Parse query params
    const workflowId = searchParams.get('workflowId')
    const limitParam = searchParams.get('limit')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Validate limit
    let limit = 20
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100)
      }
    }

    // Build query
    let query = supabase
      .from('workflow_executions')
      .select(`
        *,
        workflow:workflows(id, name, trigger_type, description)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (workflowId) {
      query = query.eq('workflow_id', workflowId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: executions, error } = await query

    if (error) {
      log.error({ error }, '[Workflow Executions API] Error')
      return NextResponse.json({
        error: 'Failed to fetch executions',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      executions: executions || [],
      count: executions?.length || 0,
    })
  } catch (error) {
    log.error({ error }, '[Workflow Executions API] Error')
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}
