import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { CreateProjectInput } from '@/types/project.types'

export const dynamic = 'force-dynamic'

// GET - Fetch all projects with optional filters
export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    
    // Extract filters from query params
    const statusFilter = searchParams.get('status') || 'all'
    const typeFilter = searchParams.get('project_type') || 'all'
    const ownerFilter = searchParams.get('owner_id') || 'all'
    const departmentFilter = searchParams.get('department') || 'all'
    const priorityFilter = searchParams.get('priority') || 'all'

    // Build query with relations
    let query = supabase
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
          user:users!project_team_members_user_id_fkey(id, first_name, last_name, email)
        )
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    if (typeFilter !== 'all') {
      query = query.eq('project_type', typeFilter)
    }
    if (ownerFilter !== 'all') {
      query = query.eq('owner_id', ownerFilter)
    }
    if (departmentFilter !== 'all') {
      query = query.eq('department', departmentFilter)
    }
    if (priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    const response = NextResponse.json(data || [])
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const body: CreateProjectInput = await request.json()

    // Clean up empty date fields
    const cleanedData = { ...body }
    if (cleanedData.start_date === '') cleanedData.start_date = undefined
    if (cleanedData.target_date === '') cleanedData.target_date = undefined

    // Prepare project data
    const projectData = {
      ...cleanedData,
      tenant_id: dataSourceTenantId,
      created_by: session.user.id,
      updated_by: session.user.id,
    }

    // Insert project
    const { data: project, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select(`
        *,
        owner:users!projects_owner_id_fkey(id, first_name, last_name, email),
        related_account:accounts!projects_related_account_id_fkey(id, name),
        related_event:events!projects_related_event_id_fkey(id, title)
      `)
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json({ error: 'Failed to create project', details: error.message }, { status: 500 })
    }

    // Revalidate the projects page
    revalidatePath('/[tenant]/projects')

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

