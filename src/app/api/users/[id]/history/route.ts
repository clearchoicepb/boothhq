import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const params = await routeContext.params
    const userId = params.id

    // Fetch pay rate history
    const { data: payRateHistory, error: payRateError } = await supabase
      .from('user_pay_rate_history')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', dataSourceTenantId)
      .order('effective_date', { ascending: false })

    if (payRateError) {
      console.error('Error fetching pay rate history:', payRateError)
    }

    // Fetch role history
    const { data: roleHistory, error: roleError } = await supabase
      .from('user_role_history')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', dataSourceTenantId)
      .order('effective_date', { ascending: false })

    if (roleError) {
      console.error('Error fetching role history:', roleError)
    }

    // Fetch event assignments with event details
    const { data: eventAssignments, error: eventError } = await supabase
      .from('event_staff_assignments')
      .select(`
        *,
        event:events (
          id,
          title,
          event_type,
          start_date,
          end_date,
          location,
          status
        ),
        staff_role:staff_roles (
          id,
          name,
          type
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (eventError) {
      console.error('Error fetching event assignments:', eventError)
    }

    return NextResponse.json({
      payRateHistory: payRateHistory || [],
      roleHistory: roleHistory || [],
      eventAssignments: eventAssignments || []
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
