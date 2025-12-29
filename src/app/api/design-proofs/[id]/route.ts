import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:design-proofs:id')

/**
 * GET /api/design-proofs/[id]
 * Get a specific design proof
 */
export async function GET(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const params = await routeContext.params
    const proofId = params.id

    const { data: proof, error } = await supabase
      .from('design_proofs')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', proofId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error || !proof) {
      return NextResponse.json(
        { error: 'Design proof not found' },
        { status: 404 }
      )
    }

    // Generate signed URL for the file
    const { data: signedUrlData } = await supabase.storage
      .from('attachments')
      .createSignedUrl(proof.storage_path, 3600) // 1 hour expiry

    return NextResponse.json({
      ...proof,
      signed_url: signedUrlData?.signedUrl || null,
      public_url: `/proof/${proof.public_token}`
    })
  } catch (error) {
    log.error({ error }, 'Unexpected error fetching design proof')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/design-proofs/[id]
 * Delete a design proof
 */
export async function DELETE(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await routeContext.params
    const proofId = params.id

    // First get the proof to get the storage path
    const { data: proof, error: fetchError } = await supabase
      .from('design_proofs')
      .select('id, storage_path')
      .eq('id', proofId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !proof) {
      return NextResponse.json(
        { error: 'Design proof not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([proof.storage_path])

    if (storageError) {
      log.error({ storageError }, 'Failed to delete file from storage')
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('design_proofs')
      .delete()
      .eq('id', proofId)
      .eq('tenant_id', dataSourceTenantId)

    if (dbError) {
      log.error({ dbError }, 'Failed to delete design proof from database')
      return NextResponse.json(
        { error: 'Failed to delete design proof' },
        { status: 500 }
      )
    }

    log.info({ proofId }, 'Design proof deleted successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Unexpected error deleting design proof')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
