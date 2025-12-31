import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:templates:duplicate')

// POST - Duplicate a template
export async function POST(
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
    const templateId = params.id

    // Fetch the original template
    const { data: original, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !original) {
      log.error({ fetchError, templateId }, 'Template not found')
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create duplicate with new name
    // Build insert data, only including fields that exist
    const insertData: Record<string, any> = {
      tenant_id: dataSourceTenantId,
      template_type: original.template_type,
      name: `Copy of ${original.name}`,
      subject: original.subject,
      content: original.content,
      merge_fields: original.merge_fields || [],
      sections: original.sections || [],
      is_active: original.is_active ?? true,
      created_by: session.user.id,
    }

    // Only include include_invoice_attachment if it exists on original
    if (original.include_invoice_attachment !== undefined) {
      insertData.include_invoice_attachment = original.include_invoice_attachment
    }

    const { data: duplicate, error: insertError } = await supabase
      .from('templates')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      log.error({
        insertError,
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      }, 'Failed to duplicate template')
      return NextResponse.json(
        { error: 'Failed to duplicate template', details: insertError.message },
        { status: 500 }
      )
    }

    log.debug({ originalId: templateId, duplicateId: duplicate.id }, 'Template duplicated')
    return NextResponse.json(duplicate)
  } catch (error) {
    log.error({ error }, 'Error duplicating template')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
