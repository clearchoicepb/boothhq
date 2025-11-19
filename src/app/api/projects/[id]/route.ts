import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { UpdateProjectInput } from '@/types/project.types'

export const dynamic = 'force-dynamic'

// GET - Fetch a single project with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, first_name, last_name, email),
        related_account:accounts!projects_related_account_id_fkey(id, name),
        related_event:events!projects_related_event_id_fkey(id, title),
        team_members:project_team_members(
          id,
          user_id,
          role,
          created_at,
          user:users!project_team_members_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      console.error('Error fetching project:', error)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const body: UpdateProjectInput = await request.json()

    // Clean up empty date fields
    const cleanedData = { ...body }
    if (cleanedData.start_date === '') cleanedData.start_date = null
    if (cleanedData.target_date === '') cleanedData.target_date = null
    if (cleanedData.completed_date === '') cleanedData.completed_date = null

    // Auto-set completed_date if status changes to completed
    if (cleanedData.status === 'completed' && !cleanedData.completed_date) {
      cleanedData.completed_date = new Date().toISOString().split('T')[0]
    }

    // Prepare update data
    const updateData = {
      ...cleanedData,
      updated_by: session.user.id,
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, first_name, last_name, email),
        related_account:accounts!projects_related_account_id_fkey(id, name),
        related_event:events!projects_related_event_id_fkey(id, title),
        team_members:project_team_members(
          id,
          user_id,
          role,
          user:users!project_team_members_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .single()

    if (error) {
      console.error('Error updating project:', error)
      return NextResponse.json({ error: 'Failed to update project', details: error.message }, { status: 500 })
    }

    // Revalidate the projects pages
    revalidatePath('/[tenant]/projects')
    revalidatePath(`/[tenant]/projects/${id}`)

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    // Delete project (cascade will handle team members)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting project:', error)
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
    }

    // Revalidate the projects page
    revalidatePath('/[tenant]/projects')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

