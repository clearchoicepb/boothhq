import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
export async function GET() {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('integration_type', 'gmail')
      .single()

    if (error) {
      return NextResponse.json({
        connected: false,
        error: error.message
      })
    }

    return NextResponse.json({
      connected: data?.is_connected || false,
      email: data?.settings?.email || null,
      created_at: data?.created_at
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
