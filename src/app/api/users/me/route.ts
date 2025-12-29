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

    const { supabase, dataSourceTenantId, session, tenantId } = context

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
      // Log detailed diagnostic info for debugging
      log.error({
        error,
        sessionUserId: session.user.id,
        sessionEmail: session.user.email,
        tenantId,
        dataSourceTenantId,
        errorCode: error.code,
        errorDetails: error.details
      }, '[Users/Me] Error fetching user - potential tenant_id mismatch')

      // Try to find user by ID only (for diagnostics)
      const { data: userByIdOnly } = await supabase
        .from('users')
        .select('id, email, tenant_id')
        .eq('id', session.user.id)
        .single()

      if (userByIdOnly) {
        log.warn({
          foundUserTenantId: userByIdOnly.tenant_id,
          expectedTenantId: dataSourceTenantId,
          sessionUserId: session.user.id
        }, '[Users/Me] User exists but tenant_id mismatch - this is the root cause')

        return NextResponse.json({
          error: 'User tenant mismatch',
          message: 'User exists but is associated with a different tenant',
          debug: {
            userTenantId: userByIdOnly.tenant_id,
            expectedTenantId: dataSourceTenantId
          }
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive fields and ensure array fields have proper defaults
    const { password_hash, ...userWithoutPassword } = user

    // Ensure departments array fields have proper defaults to prevent frontend errors
    const normalizedUser = {
      ...userWithoutPassword,
      departments: userWithoutPassword.departments || [],
      manager_of_departments: userWithoutPassword.manager_of_departments || []
    }

    return NextResponse.json(normalizedUser)
  } catch (error) {
    log.error({ error }, '[Users/Me] Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
