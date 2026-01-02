import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:duplicates')

export async function GET(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('type') || 'all' // 'contacts', 'accounts', or 'all'
    const threshold = parseFloat(searchParams.get('threshold') || '0.5')

    const results: {
      contacts?: unknown[]
      accounts?: unknown[]
    } = {}

    // Find duplicate contacts
    if (entityType === 'contacts' || entityType === 'all') {
      const { data: contactDuplicates, error: contactsError } = await supabase
        .rpc('find_duplicate_contacts', {
          p_tenant_id: dataSourceTenantId,
          p_threshold: threshold
        })

      if (contactsError) {
        log.error({ error: contactsError }, 'Error finding duplicate contacts')
        // Don't fail completely, just log the error
      } else {
        results.contacts = contactDuplicates || []
      }
    }

    // Find duplicate accounts
    if (entityType === 'accounts' || entityType === 'all') {
      const { data: accountDuplicates, error: accountsError } = await supabase
        .rpc('find_duplicate_accounts', {
          p_tenant_id: dataSourceTenantId,
          p_threshold: threshold
        })

      if (accountsError) {
        log.error({ error: accountsError }, 'Error finding duplicate accounts')
        // Don't fail completely, just log the error
      } else {
        results.accounts = accountDuplicates || []
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    log.error({ error }, 'Error scanning for duplicates')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Check for duplicates when creating/editing a record
export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context

    const body = await request.json()
    const { entityType, data, excludeId } = body

    if (!entityType || !data) {
      return NextResponse.json(
        { error: 'entityType and data are required' },
        { status: 400 }
      )
    }

    let duplicates: unknown[] = []

    if (entityType === 'contact') {
      const { data: contactDuplicates, error } = await supabase
        .rpc('check_contact_duplicates', {
          p_tenant_id: dataSourceTenantId,
          p_first_name: data.first_name || '',
          p_last_name: data.last_name || '',
          p_email: data.email || null,
          p_phone: data.phone || null,
          p_exclude_id: excludeId || null
        })

      if (error) {
        log.error({ error }, 'Error checking contact duplicates')
        return NextResponse.json(
          { error: 'Failed to check for duplicates' },
          { status: 500 }
        )
      }

      duplicates = contactDuplicates || []
    } else if (entityType === 'account') {
      const { data: accountDuplicates, error } = await supabase
        .rpc('check_account_duplicates', {
          p_tenant_id: dataSourceTenantId,
          p_name: data.name || '',
          p_email: data.email || null,
          p_phone: data.phone || null,
          p_exclude_id: excludeId || null
        })

      if (error) {
        log.error({ error }, 'Error checking account duplicates')
        return NextResponse.json(
          { error: 'Failed to check for duplicates' },
          { status: 500 }
        )
      }

      duplicates = accountDuplicates || []
    } else {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be "contact" or "account"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ duplicates })

  } catch (error) {
    log.error({ error }, 'Error checking for duplicates')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
