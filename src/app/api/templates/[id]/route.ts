import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - Get single template
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const templateId = params.id

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', session.user.tenantId)
      .single()

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update template
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const templateId = params.id

    const body = await request.json()
    const { name, subject, content, merge_fields, is_active } = body

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject
    if (content !== undefined) updateData.content = content
    if (merge_fields !== undefined) updateData.merge_fields = merge_fields
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: template, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('tenant_id', session.user.tenantId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete template
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const templateId = params.id

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
