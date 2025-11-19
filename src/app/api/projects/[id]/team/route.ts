import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

// POST - Add a team member to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id: projectId } = await params
    const body = await request.json()

    const { user_id, role } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Add team member
    const { data: teamMember, error } = await supabase
      .from('project_team_members')
      .insert({
        tenant_id: dataSourceTenantId,
        project_id: projectId,
        user_id,
        role: role || 'contributor',
      })
      .select(`
        *,
        user:users(id, first_name, last_name, email)
      `)
      .single()

    if (error) {
      console.error('Error adding team member:', error)
      return NextResponse.json({ error: 'Failed to add team member', details: error.message }, { status: 500 })
    }

    // Revalidate
    revalidatePath(`/[tenant]/projects/${projectId}`)

    return NextResponse.json(teamMember, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a team member from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
    }

    // Remove team member
    const { error } = await supabase
      .from('project_team_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', projectId)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    // Revalidate
    revalidatePath(`/[tenant]/projects/${projectId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

