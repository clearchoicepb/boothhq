/**
 * Workflow Validation API Route
 *
 * Validates workflow configuration before saving
 * POST /api/workflows/validate
 */

import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { workflowEngine } from '@/lib/services/workflowEngine'

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { workflow, actions } = await request.json()

    // Use workflow engine's validation method
    const validation = await workflowEngine.validateWorkflow(
      workflow,
      actions,
      supabase,
      dataSourceTenantId
    )

    return NextResponse.json(validation)
  } catch (error) {
    console.error('[workflows/validate] Error:', error)
    return NextResponse.json(
      {
        isValid: false,
        errors: ['Internal server error during validation'],
        warnings: [],
      },
      { status: 500 }
    )
  }
}

