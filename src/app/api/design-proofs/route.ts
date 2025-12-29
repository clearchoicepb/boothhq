import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import { randomBytes } from 'crypto'

const log = createLogger('api:design-proofs')

/**
 * Generate a secure 64-character hex token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * GET /api/design-proofs
 * List design proofs for an event
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json(
        { error: 'event_id is required' },
        { status: 400 }
      )
    }

    const { data: proofs, error } = await supabase
      .from('design_proofs')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      log.error({ error }, 'Failed to fetch design proofs')
      return NextResponse.json(
        { error: 'Failed to fetch design proofs' },
        { status: 500 }
      )
    }

    return NextResponse.json(proofs || [])
  } catch (error) {
    log.error({ error }, 'Unexpected error fetching design proofs')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/design-proofs
 * Upload a new design proof
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('event_id') as string

    if (!file || !eventId) {
      return NextResponse.json(
        { error: 'file and event_id are required' },
        { status: 400 }
      )
    }

    // Validate file type (images and PDFs only)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf'
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only images (JPG, PNG, WebP, GIF) and PDFs are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB for design files)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 25MB' },
        { status: 400 }
      )
    }

    // Verify event exists and belongs to tenant
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Generate unique file path and public token
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileName = `${timestamp}-${randomId}.${fileExt}`
    const storagePath = `${dataSourceTenantId}/design-proofs/${eventId}/${fileName}`
    const publicToken = generateToken()

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      log.error({ uploadError }, 'Storage upload error')
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create design proof record
    const { data: proof, error: dbError } = await supabase
      .from('design_proofs')
      .insert({
        tenant_id: dataSourceTenantId,
        event_id: eventId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        public_token: publicToken,
        status: 'pending',
        uploaded_by: session.user.id,
      })
      .select(`
        *,
        uploaded_by_user:users!uploaded_by (
          first_name,
          last_name,
          email
        )
      `)
      .single()

    if (dbError) {
      log.error({ dbError }, 'Database error creating design proof')
      // Clean up uploaded file
      await supabase.storage.from('attachments').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create design proof record' },
        { status: 500 }
      )
    }

    log.info({ proofId: proof.id, eventId }, 'Design proof uploaded successfully')

    return NextResponse.json({
      ...proof,
      public_url: `/proof/${publicToken}`
    })
  } catch (error) {
    log.error({ error }, 'Unexpected error uploading design proof')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
