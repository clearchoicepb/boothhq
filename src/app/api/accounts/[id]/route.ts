import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:accounts')
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id } = await params
    const { data, error } = await supabase
      .from('accounts')
      .select(`
        *,
        contact_accounts(
          id,
          role,
          is_primary,
          start_date,
          end_date,
          notes,
          contacts(id, first_name, last_name, email, phone, job_title, avatar_url)
        ),
        opportunities(id, name, stage, amount, expected_close_date),
        events(id, title, start_date, status)
      `)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      log.error({ error }, 'Error fetching account')
      return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Transform the data to add helper properties
    const transformedData = {
      ...data,
      // All contacts with roles (new many-to-many)
      all_contacts: data.contact_accounts?.map((ca: any) => ({
        ...ca.contacts,
        role: ca.role,
        is_primary: ca.is_primary,
        start_date: ca.start_date,
        end_date: ca.end_date,
        notes: ca.notes,
        junction_id: ca.id
      })) || [],
      
      // Active contacts only (no end_date)
      active_contacts: data.contact_accounts
        ?.filter((ca: any) => !ca.end_date)
        .map((ca: any) => ({
          ...ca.contacts,
          role: ca.role,
          is_primary: ca.is_primary,
          start_date: ca.start_date,
          junction_id: ca.id
        })) || [],
      
      // Primary contact (backward compatibility)
      primary_contact: data.contact_accounts?.find((ca: any) => ca.is_primary)?.contacts || null,
      
      // Former contacts (has end_date)
      former_contacts: data.contact_accounts
        ?.filter((ca: any) => ca.end_date)
        .map((ca: any) => ({
          ...ca.contacts,
          role: ca.role,
          start_date: ca.start_date,
          end_date: ca.end_date,
          junction_id: ca.id
        })) || []
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const { id } = await params
    const body = await request.json()
    const { data, error} = await supabase
      .from('accounts')
      .update(body)
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error updating account')
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    const { id } = await params
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      log.error({ error }, 'Error deleting account')
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    // Revalidate the accounts list page to show deletion immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/${tenantSubdomain}/accounts`)

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
