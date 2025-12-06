import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:core-tasks')
export async function GET() {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { data: templates, error } = await supabase
      .from('core_task_templates')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .eq('is_active', true)
      .order('display_order')

    if (error) throw error

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0
    })
  } catch (error: any) {
    log.error({ error }, 'Error fetching core task templates')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
