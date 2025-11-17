import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[save-to-files/route.ts] POST request received')
  
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id: contractId } = await params
    const body = await request.json()
    const { event_id, status = 'sent' } = body

    console.log('[save-to-files/route.ts] Request params:', { contractId, event_id, status })

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
      console.error('[save-to-files/route.ts] Contract not found:', contractError)
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    console.log('[save-to-files/route.ts] Contract found:', {
      id: contract.id,
      template_name: contract.template_name,
      status: contract.status
    })

    // Check if file entry already exists
    const { data: existingFile } = await supabase
      .from('files')
      .select('id')
      .eq('tenant_id', dataSourceTenantId)
      .eq('entity_type', 'event')
      .eq('entity_id', event_id)
      .contains('metadata', { contract_id: contractId })
      .single()

    if (existingFile) {
      console.log('[save-to-files/route.ts] File entry already exists, updating status')
      
      // Update existing file entry
      const { error: updateError } = await supabase
        .from('files')
        .update({
          metadata: {
            contract_id: contractId,
            contract_status: status,
            is_contract: true
          }
        })
        .eq('id', existingFile.id)

      if (updateError) {
        console.error('[save-to-files/route.ts] Error updating file entry:', updateError)
        return NextResponse.json(
          { error: 'Failed to update file entry' },
          { status: 500 }
        )
      }

      console.log('[save-to-files/route.ts] File entry updated successfully')
      return NextResponse.json({ success: true, fileId: existingFile.id })
    }

    // Create new file entry
    const fileData = {
      tenant_id: dataSourceTenantId,
      entity_type: 'event',
      entity_id: event_id,
      file_name: 'Event Agreement',
      file_type: 'application/pdf',
      file_size: 0, // Virtual file
      file_url: `/contracts/${contractId}`,
      description: `Agreement: ${contract.template_name || 'Contract'}`,
      metadata: {
        contract_id: contractId,
        contract_status: status,
        is_contract: true
      },
      uploaded_by: session.user.id
    }

    console.log('[save-to-files/route.ts] Creating file entry:', fileData)

    const { data: newFile, error: fileError } = await supabase
      .from('files')
      .insert(fileData)
      .select()
      .single()

    if (fileError) {
      console.error('[save-to-files/route.ts] Error creating file entry:', fileError)
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

    console.log('[save-to-files/route.ts] File entry created successfully:', newFile.id)

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
    console.error('[save-to-files/route.ts] ERROR:', error)
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

