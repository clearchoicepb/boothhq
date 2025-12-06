import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:auth')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Get all users with this email across all tenants
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        tenant_id,
        role,
        tenants!inner(
          id,
          name,
          subdomain,
          plan,
          status
        )
      `)
      .eq('email', email)
      .eq('status', 'active')
      .eq('tenants.status', 'active')

    if (error) {
      log.error({ error }, 'Error fetching user tenants')
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ tenants: [] })
    }

    // Transform data to return clean tenant list
    const tenants = users.map(user => ({
      id: user.tenants.id,
      name: user.tenants.name,
      subdomain: user.tenants.subdomain,
      plan: user.tenants.plan,
      userId: user.id,
      userRole: user.role
    }))

    return NextResponse.json({ tenants })
  } catch (error) {
    log.error({ error }, 'Error in tenants API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
