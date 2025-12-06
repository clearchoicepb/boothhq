import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:contracts')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  log.debug('POST request received')
  
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id: contractId } = await params
    const body = await request.json()
    const { event_id, status = 'sent' } = body

    log.debug('Request params:', { contractId, event_id, status })

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
    }

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (contractError || !contract) {
      log.error({ contractError }, '[save-to-files/route.ts] Contract not found')
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    log.debug('Contract found:', {
      id: contract.id,
      template_name: contract.template_name,
      status: contract.status
    })

    // Check if file entry already exists using description field to track contract ID
    const { data: existingFile } = await supabase
      .from('attachments')
      .select('id, description')
      .eq('tenant_id', dataSourceTenantId)
      .eq('entity_type', 'event')
      .eq('entity_id', event_id)
      .like('description', `%[CONTRACT:${contractId}]%`)
      .single()

    if (existingFile) {
      log.debug('File entry already exists:', existingFile.id)
      
      // Update existing file entry description to reflect new status
      const updatedDescription = `Agreement: ${contract.template_name || 'Contract'} [CONTRACT:${contractId}] [STATUS:${status}]`
      
      const { error: updateError } = await supabase
        .from('attachments')
        .update({
          description: updatedDescription
        })
        .eq('id', existingFile.id)

      if (updateError) {
        log.error({ updateError }, '[save-to-files/route.ts] Error updating file entry')
        return NextResponse.json(
          { error: 'Failed to update file entry' },
          { status: 500 }
        )
      }

      log.debug('File entry updated successfully')
      return NextResponse.json({ success: true, fileId: existingFile.id })
    }

    // Create new file entry
    // Note: attachments table requires storage_path, so we use a virtual path
    const fileData = {
      tenant_id: dataSourceTenantId,
      entity_type: 'event',
      entity_id: event_id,
      file_name: 'Event Agreement',
      file_type: 'application/pdf',
      file_size: 0, // Virtual file
      storage_path: `/virtual/contracts/${contractId}`, // Virtual path for contract reference
      description: `Agreement: ${contract.template_name || 'Contract'} [CONTRACT:${contractId}] [STATUS:${status}]`,
      uploaded_by: session.user.id
    }

    log.debug('Creating file entry:', fileData)

    const { data: newFile, error: fileError } = await supabase
      .from('attachments')
      .insert(fileData)
      .select()
      .single()

    if (fileError) {
      log.error({ fileError }, '[save-to-files/route.ts] Error creating file entry')
      console.error('[save-to-files/route.ts] Error details:', {
        code: fileError.code,
        message: fileError.message,
        details: fileError.details,
        hint: fileError.hint
      })
      return NextResponse.json(
        { error: 'Failed to create file entry', details: fileError.message },
        { status: 500 }
      )
    }

    log.debug('File entry created successfully:', newFile.id)

    // Also update contract status to match
    if (status === 'sent') {
      await supabase
        .from('contracts')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', contractId)
      
      console.log('[save-to-files/route.ts] Contract status updated to "sent"')
    }

    return NextResponse.json({ 
      success: true, 
      fileId: newFile.id,
      debug: {
        contractId,
        eventId: event_id,
        status,
        fileCreated: true
      }
    })
  } catch (error) {
    log.error({ error }, '[save-to-files/route.ts] ERROR')
    console.error('[save-to-files/route.ts] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

