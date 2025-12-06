import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:attachments')
// GET - List attachments for an entity
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    log.debug('GET request:', { entityType, entityId, dataSourceTenantId })

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      )
    }

    // Query attachments table (includes both uploaded files and contract references)
    const { data: attachments, error: attachmentsError } = await supabase
      .from('attachments')
      .select(`
        *,
        uploaded_by_user:users!uploaded_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })

    log.debug('Attachments query result:', {
      count: attachments?.length || 0,
      error: attachmentsError
    })

    if (attachmentsError) {
      log.error({ attachmentsError }, '[attachments/route.ts] Query failed')
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      )
    }

    // Parse description field to extract contract metadata if present
    const filesWithMetadata = (attachments || []).map(file => {
      // Check if description contains contract metadata
      const contractMatch = file.description?.match(/\[CONTRACT:([^\]]+)\]/)
      const statusMatch = file.description?.match(/\[STATUS:([^\]]+)\]/)
      
      if (contractMatch) {
        return {
          ...file,
          metadata: {
            is_contract: true,
            contract_id: contractMatch[1],
            contract_status: statusMatch ? statusMatch[1] : 'draft'
          }
        }
      }
      
      return file
    })

    log.debug('Total files returned:', filesWithMetadata.length)
    log.debug('Contract files:', filesWithMetadata.filter(f => f.metadata?.is_contract).length)

    return NextResponse.json(filesWithMetadata)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Upload new attachment
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
    const entityType = formData.get('entity_type') as string
    const entityId = formData.get('entity_id') as string
    const description = formData.get('description') as string | null

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: 'file, entity_type, and entity_id are required' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${dataSourceTenantId}/${entityType}/${entityId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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

    // Create attachment record
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        tenant_id: dataSourceTenantId,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
        description: description || null,
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
      log.error({ dbError }, 'Database error')
      // Clean up uploaded file
      await supabase.storage.from('attachments').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      )
    }

    return NextResponse.json(attachment)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
