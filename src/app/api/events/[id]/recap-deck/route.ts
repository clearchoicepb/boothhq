import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext, updateWithTenantId } from '@/lib/tenant-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:events:recap-deck')

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/events/[id]/recap-deck
 * Get download URL for recap deck
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id: eventId } = await params

    // Get event with recap deck path
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('recap_deck_path')
      .eq('tenant_id', dataSourceTenantId)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.recap_deck_path) {
      return NextResponse.json({ error: 'No recap deck uploaded' }, { status: 404 })
    }

    // Create signed URL for download
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('attachments')
      .createSignedUrl(event.recap_deck_path, 3600) // 1 hour expiry

    if (signedUrlError || !signedUrlData) {
      log.error({ error: signedUrlError }, 'Failed to create signed URL')
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    const fileName = event.recap_deck_path.split('/').pop() || 'recap-deck.pdf'

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName,
    })
  } catch (error) {
    log.error({ error }, 'Recap deck GET error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/events/[id]/recap-deck
 * Upload a recap deck PDF
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id: eventId } = await params

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, recap_deck_path')
      .eq('tenant_id', dataSourceTenantId)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Delete existing file if present
    if (event.recap_deck_path) {
      const { error: deleteError } = await supabase.storage
        .from('attachments')
        .remove([event.recap_deck_path])

      if (deleteError) {
        log.warn({ error: deleteError }, 'Failed to delete existing recap deck')
      }
    }

    // Generate storage path
    const fileName = `recap-deck-${Date.now()}.pdf`
    const storagePath = `${dataSourceTenantId}/events/${eventId}/recap-deck/${fileName}`

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      log.error({ error: uploadError }, 'Failed to upload recap deck')
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Update event with new path
    const { error: updateError } = await updateWithTenantId(
      supabase,
      'events',
      eventId,
      {
        recap_deck_path: storagePath,
        recap_deck_uploaded_at: new Date().toISOString(),
        recap_deck_uploaded_by: session.user.id,
      },
      dataSourceTenantId,
      session.user.id
    )

    if (updateError) {
      log.error({ error: updateError }, 'Failed to update event with recap deck path')
      // Try to clean up uploaded file
      await supabase.storage.from('attachments').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save file reference' }, { status: 500 })
    }

    log.info({ eventId, storagePath }, 'Recap deck uploaded')
    return NextResponse.json({ success: true, path: storagePath })
  } catch (error) {
    log.error({ error }, 'Recap deck POST error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/events/[id]/recap-deck
 * Delete the recap deck
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id: eventId } = await params

    // Get event with recap deck path
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('recap_deck_path')
      .eq('tenant_id', dataSourceTenantId)
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.recap_deck_path) {
      return NextResponse.json({ error: 'No recap deck to delete' }, { status: 404 })
    }

    // Delete file from storage
    const { error: deleteError } = await supabase.storage
      .from('attachments')
      .remove([event.recap_deck_path])

    if (deleteError) {
      log.error({ error: deleteError }, 'Failed to delete recap deck from storage')
      // Continue anyway to clear the reference
    }

    // Clear event reference
    const { error: updateError } = await updateWithTenantId(
      supabase,
      'events',
      eventId,
      {
        recap_deck_path: null,
        recap_deck_uploaded_at: null,
        recap_deck_uploaded_by: null,
      },
      dataSourceTenantId,
      session.user.id
    )

    if (updateError) {
      log.error({ error: updateError }, 'Failed to clear recap deck reference')
      return NextResponse.json({ error: 'Failed to delete file reference' }, { status: 500 })
    }

    log.info({ eventId }, 'Recap deck deleted')
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Recap deck DELETE error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
