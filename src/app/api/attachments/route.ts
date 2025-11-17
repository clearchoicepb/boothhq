import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
// GET - List attachments for an entity
export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')

    console.log('[attachments/route.ts] GET request:', { entityType, entityId, dataSourceTenantId })

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      )
    }

    // Query both 'attachments' and 'files' tables to get all files
    // (We save contracts to 'files' table, regular uploads to 'attachments' table)
    
    // Query attachments table
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

    console.log('[attachments/route.ts] Attachments query result:', {
      count: attachments?.length || 0,
      error: attachmentsError
    })

    // Query files table (for contracts and other system files)
    const { data: files, error: filesError } = await supabase
      .from('files')
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

    console.log('[attachments/route.ts] Files query result:', {
      count: files?.length || 0,
      error: filesError,
      files: files
    })

    if (attachmentsError && filesError) {
      console.error('[attachments/route.ts] Both queries failed:', { attachmentsError, filesError })
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      )
    }

    // Merge both results
    const allFiles = [
      ...(attachments || []),
      ...(files || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('[attachments/route.ts] Total files returned:', allFiles.length)

    return NextResponse.json(allFiles)
  } catch (error) {
    console.error('Error:', error)
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
      console.error('Storage upload error:', uploadError)
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
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('attachments').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      )
    }

    return NextResponse.json(attachment)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
