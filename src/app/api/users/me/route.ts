import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:users')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile including department management info
 */
export async function GET() {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch current user from tenant database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, '[Users/Me] Error fetching user')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive fields
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    log.error({ error }, '[Users/Me] Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
