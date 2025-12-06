import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:design')
// GET - Fetch all design types for tenant
export async function GET() {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
  try {
    const { data, error } = await supabase
      .from('design_item_types')
      .select('*')
      .eq('tenant_id', dataSourceTenantId)
      .order('display_order')

    if (error) throw error

    return NextResponse.json({ types: data || [] })
  } catch (error: any) {
    log.error({ error }, 'Error fetching design types')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new design type
export async function POST(request: Request) {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context

  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('design_item_types')
      .insert({
        ...body,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ type: data })
  } catch (error: any) {
    log.error({ error }, 'Error creating design type')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
