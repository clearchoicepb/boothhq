import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, type UserRole } from '@/lib/roles'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:users')

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    // Check if user has admin role
    if (!isAdmin(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userIds } = body

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        error: 'Invalid request: action and userIds array required'
      }, { status: 400 })
    }

    let result

    switch (action) {
      case 'archive':
        // Soft delete: set archived_at timestamp
        result = await supabase
          .from('users')
          .update({
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .eq('tenant_id', dataSourceTenantId)

        break

      case 'unarchive':
        // Restore: clear archived_at timestamp
        result = await supabase
          .from('users')
          .update({
            archived_at: null,
            updated_at: new Date().toISOString()
          })
          .in('id', userIds)
          .eq('tenant_id', dataSourceTenantId)

        break

      case 'deactivate':
        result = await supabase
          .from('users')
          .update({ status: 'inactive' })
          .in('id', userIds)
          .eq('tenant_id', dataSourceTenantId)

        break

      case 'reactivate':
        result = await supabase
          .from('users')
          .update({ status: 'active', termination_date: null })
          .in('id', userIds)
          .eq('tenant_id', dataSourceTenantId)

        break

      case 'delete':
        // Delete the users
        result = await supabase
          .from('users')
          .delete()
          .in('id', userIds)
          .eq('tenant_id', dataSourceTenantId)

        // Also delete from Supabase Auth
        for (const userId of userIds) {
          try {
            await supabase.auth.admin.deleteUser(userId)
          } catch (authError) {
            log.error({ authError }, 'Error deleting auth user ${userId}')
            // Continue with other deletions
          }
        }

        break

      default:
        return NextResponse.json({
          error: `Invalid action: ${action}`
        }, { status: 400 })
    }

    if (result.error) {
      log.error({ action, error: result.error }, 'Error performing bulk action')
      return NextResponse.json({
        error: `Failed to ${action} users: ${result.error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully ${action}d ${userIds.length} user(s)`,
      count: userIds.length
    })
  } catch (error) {
    log.error({ error }, 'Error in POST /api/users/bulk')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
