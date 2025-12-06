import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:design')
// GET - Fetch all design statuses for tenant
export async function GET() {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { data, error } = await supabase
      .from('design_statuses')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('display_order')

    if (error) throw error

    return NextResponse.json({ statuses: data || [] })
  } catch (error: any) {
    log.error({ error }, 'Error fetching design statuses')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new design status
export async function POST(request: Request) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('design_statuses')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ status: data })
  } catch (error: any) {
    log.error({ error }, 'Error creating design status')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
