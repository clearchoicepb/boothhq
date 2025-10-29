import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('type') // email, sms, contract, or null for all

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    let query = supabase
      .from('templates')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .order('created_at', { ascending: false })

    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { template_type, name, subject, content, merge_fields, is_active } = body

    if (!template_type || !name || !content) {
      return NextResponse.json(
        { error: 'template_type, name, and content are required' },
        { status: 400 }
      )
    }

    // Validate template_type
    if (!['email', 'sms', 'contract'].includes(template_type)) {
      return NextResponse.json(
        { error: 'template_type must be email, sms, or contract' },
        { status: 400 }
      )
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        tenant_id: session.user.tenantId,
        template_type,
        name,
        subject: subject || null,
        content,
        merge_fields: merge_fields || [],
        is_active: is_active !== undefined ? is_active : true,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create template' },
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
