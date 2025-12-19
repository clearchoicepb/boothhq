import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient, getTenantDatabaseClient } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:auth:switch-tenant')

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { tenantId } = await request.json()

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      )
    }

    // Get tenant info from App DB
    const appSupabase = createServerSupabaseClient()
    const { data: tenant, error: tenantError } = await appSupabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('status', 'active')
      .single()

    if (tenantError || !tenant) {
      log.warn({ tenantId }, 'Tenant not found or inactive')
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 404 }
      )
    }

    // Verify user has access to this tenant via Tenant DB
    const DEFAULT_TENANT_ID = '5f98f4c0-5254-4c61-8633-55ea049c7f18'
    const tenantSupabase = await getTenantDatabaseClient(DEFAULT_TENANT_ID)

    const { data: user, error: userError } = await tenantSupabase
      .from('users')
      .select('id, role, permissions')
      .eq('email', session.user.email)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single()

    if (userError || !user) {
      log.warn({ tenantId }, 'User does not have access to this tenant')
      return NextResponse.json(
        { error: 'Access denied to this tenant' },
        { status: 403 }
      )
    }

    // Update last login
    await tenantSupabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Return the new session data
    return NextResponse.json({
      success: true,
      sessionData: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSubdomain: tenant.subdomain,
        role: user.role,
        permissions: user.permissions || {}
      }
    })
  } catch (error) {
    log.error({ error }, 'Error switching tenant')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
