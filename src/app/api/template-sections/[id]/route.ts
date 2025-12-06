import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:template-sections')

// PUT - Update section
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { name, category, content, description, merge_fields } = body

    if (!name || !category || !content) {
      return NextResponse.json(
        { error: 'name, category, and content are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['header', 'party-info', 'event-details', 'payment', 'operations', 'legal', 'signature']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Only allow updating custom sections (not system sections)
    const { data, error } = await supabase
      .from('template_sections')
      .update({
        name,
        category,
        content,
        description,
        merge_fields: merge_fields || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId) // Ensures tenant isolation
      .eq('is_system', false) // Can only update custom sections
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Section not found or cannot be modified' },
          { status: 404 }
        )
      }
      log.error({ error }, 'Database error')
      return NextResponse.json(
        { error: 'Failed to update section' },
        { status: 500 }
      )
    }

    return NextResponse.json({ section: data })
  } catch (error) {
    log.error({ error }, 'Error updating section')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete section
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Only allow deleting custom sections (not system sections)
    const { error } = await supabase
      .from('template_sections')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId) // Ensures tenant isolation
      .eq('is_system', false) // Can only delete custom sections

    if (error) {
      log.error({ error }, 'Database error')
      return NextResponse.json(
        { error: 'Failed to delete section' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error deleting section')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
