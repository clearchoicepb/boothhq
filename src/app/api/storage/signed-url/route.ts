import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:storage:signed-url')

/**
 * GET /api/storage/signed-url
 *
 * Generate a signed URL for accessing a file in storage.
 * Used for viewing uploaded files (like form uploads) in the admin UI.
 *
 * Query params:
 * - path: The storage path of the file (e.g., "tenant123/form-uploads/...")
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    // Require authentication
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get path from query params
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'path query parameter is required' },
        { status: 400 }
      )
    }

    // Security: Ensure the path belongs to the current tenant
    // Storage paths should start with the tenant ID
    if (!path.startsWith(`${dataSourceTenantId}/`)) {
      log.warn({ path, tenantId: dataSourceTenantId }, 'Attempted access to file from different tenant')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('attachments')
      .createSignedUrl(path, 3600)

    if (urlError || !signedUrlData) {
      log.error({ urlError, path }, 'Error creating signed URL')
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      expiresIn: 3600,
    })
  } catch (error) {
    log.error({ error }, 'Error generating signed URL')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
