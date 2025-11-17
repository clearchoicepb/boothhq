import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getMergeFieldData, replaceMergeFields } from '@/lib/merge-fields'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// API endpoint for creating and fetching contracts
export async function POST(request: NextRequest) {
  console.log('[contracts/route.ts] POST request received')
  console.log('[contracts/route.ts] URL:', request.url)
  console.log('[contracts/route.ts] Method:', request.method)
  
  try {
    console.log('[contracts/route.ts] Getting tenant context...')
    const context = await getTenantContext()
    if (context instanceof NextResponse) {
      console.log('[contracts/route.ts] Context returned NextResponse (error)')
      return context
    }

    const { supabase, dataSourceTenantId, session } = context
    console.log('[contracts/route.ts] Context obtained:', {
      hasSupabase: !!supabase,
      dataSourceTenantId,
      hasSession: !!session
    })

    if (!session?.user) {
      console.log('[contracts/route.ts] No session user - Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[contracts/route.ts] Reading request body...')
    const body = await request.json()
    console.log('[contracts/route.ts] Request body:', body)
    
    const {
      event_id,
      template_id,
      template_content,
      title,
      signer_email,
      signer_name,
      expires_days = 30
    } = body

    if (!event_id || !template_content || !title) {
      console.log('[contracts/route.ts] Missing required fields:', { event_id, has_template_content: !!template_content, title })
      return NextResponse.json(
        { error: 'event_id, template_content, and title are required' },
        { status: 400 }
      )
    }
    
    console.log('[contracts/route.ts] All required fields present, proceeding...')

    // Get event data
    console.log('[contracts/route.ts] Fetching event with ID:', event_id)
    console.log('[contracts/route.ts] Using tenant_id:', dataSourceTenantId)
    
    // Note: RLS handles tenant filtering automatically via app.current_tenant_id
    // Specify the exact foreign key relationship since events has multiple contacts relationships
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        accounts(*),
        contacts:contacts!events_contact_id_fkey(*)
      `)
      .eq('id', event_id)
      .single()

    console.log('[contracts/route.ts] Event query result:', {
      hasEvent: !!event,
      eventError: eventError?.message,
      eventErrorCode: eventError?.code,
      eventErrorDetails: eventError?.details
    })

    if (eventError || !event) {
      console.error('[contracts/route.ts] Event not found. Error:', eventError)
      return NextResponse.json({ 
        error: 'Event not found',
        debug: {
          event_id,
          tenant_id: dataSourceTenantId,
          error: eventError?.message
        }
      }, { status: 404 })
    }
    
    console.log('[contracts/route.ts] Event found:', event.id, event.title)

    // Build merge field data directly from event (server-side, can't use HTTP fetch)
    const mergeData: any = {}
    
    // Event data
    if (event) {
      mergeData.event_title = event.title
      mergeData.event_load_in_notes = event.load_in_notes
      mergeData.event_setup_time = event.setup_time
      mergeData.load_in_notes = event.load_in_notes
      mergeData.setup_time = event.setup_time
      
      // Contact data
      if (event.contacts) {
        mergeData.contact_first_name = event.contacts.first_name
        mergeData.contact_last_name = event.contacts.last_name
        mergeData.contact_full_name = `${event.contacts.first_name || ''} ${event.contacts.last_name || ''}`.trim()
        mergeData.contact_email = event.contacts.email
        mergeData.contact_phone = event.contacts.phone
        mergeData.first_name = event.contacts.first_name
        mergeData.last_name = event.contacts.last_name
        mergeData.email = event.contacts.email
        mergeData.phone = event.contacts.phone
        mergeData.contact_name = mergeData.contact_full_name
      }
      
      // Account data
      if (event.accounts) {
        mergeData.account_name = event.accounts.name
        mergeData.account_phone = event.accounts.phone
        mergeData.account_email = event.accounts.email
        mergeData.company_name = event.accounts.name
      }
    }
    
    console.log('[contracts/route.ts] Merge data built:', Object.keys(mergeData))

    // Replace merge fields in template
    const processedContent = replaceMergeFields(template_content, mergeData)

    // Generate contract number (RLS handles tenant filtering)
    const { count: contractCount } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })

    console.log('[contracts/route.ts] Contract count:', contractCount)
    const contractNumber = `CON-${String((contractCount || 0) + 1).padStart(5, '0')}`
    console.log('[contracts/route.ts] Generated contract number:', contractNumber)

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_days)

    // Create contract using actual database schema column names
    // Note: Database uses template_name (not title), recipient_email (not signer_email), etc.
    const insertData: any = {
      tenant_id: dataSourceTenantId,
      event_id,
      content: processedContent,
      status: 'draft',
      template_name: title, // Database uses 'template_name' not 'title'
      recipient_email: mergeData.contact_email || null, // Database uses 'recipient_email' not 'signer_email'
      recipient_name: mergeData.contact_full_name || null // Database uses 'recipient_name' not 'signer_name'
    }
    
    // Add optional fields
    if (event.account_id) insertData.account_id = event.account_id
    if (event.contact_id) insertData.contact_id = event.contact_id
    if (template_id) insertData.template_id = template_id
    if (contractNumber) insertData.contract_number = contractNumber
    if (expiresAt) insertData.expires_at = expiresAt.toISOString()
    if (session.user.id) insertData.created_by = session.user.id
    
    console.log('[contracts/route.ts] Inserting with data:', Object.keys(insertData))
    console.log('[contracts/route.ts] Insert values:', { 
      template_name: insertData.template_name,
      recipient_email: insertData.recipient_email,
      recipient_name: insertData.recipient_name,
      status: insertData.status
    })
    
    const { data: contract, error: contractError} = await supabase
      .from('contracts')
      .insert(insertData)
      .select()
      .single()
    
    console.log('[contracts/route.ts] Insert result:', { hasContract: !!contract, error: contractError })

    if (contractError) {
      console.error('Error creating contract:', contractError)
      return NextResponse.json(
        { error: 'Failed to create contract' },
        { status: 500 }
      )
    }

    console.log('[contracts/route.ts] Contract created successfully:', contract.id)
    console.log('[contracts/route.ts] NOTE: File entry NOT auto-created - waiting for user to save')
    
    return NextResponse.json(contract)
  } catch (error) {
    console.error('[contracts/route.ts] ERROR in POST handler:', error)
    console.error('[contracts/route.ts] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('[contracts/route.ts] GET request received')
  console.log('[contracts/route.ts] URL:', request.url)
  
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    console.log('[contracts/route.ts] GET Context obtained:', {
      hasSupabase: !!supabase,
      dataSourceTenantId,
      hasSession: !!session
    })

    if (!session?.user) {
      console.log('[contracts/route.ts] GET No session - Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    // Note: RLS handles tenant filtering automatically
    // Note: We don't need to specify foreign key for contracts->contacts since there's only one relationship
    let query = supabase
      .from('contracts')
      .select(`
        *,
        events(id, event_name),
        accounts(id, name),
        contacts(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[contracts/route.ts] GET Error fetching contracts:', error)
      console.error('[contracts/route.ts] GET Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Failed to fetch contracts', details: error.message },
        { status: 500 }
      )
    }

    console.log('[contracts/route.ts] GET Query successful, contracts count:', data?.length || 0)

    // Transform the data to match frontend expectations
    const formattedData = (data || []).map(contract => {
      console.log('[contracts/route.ts] Processing contract:', contract.id, {
        has_events: !!contract.events,
        has_accounts: !!contract.accounts,
        has_contacts: !!contract.contacts
      })
      
      return {
        ...contract,
        event: contract.events ? {
          id: contract.events.id,
          event_name: contract.events.event_name
        } : null,
        account: contract.accounts ? {
          id: contract.accounts.id,
          name: contract.accounts.name
        } : null,
        contact: contract.contacts ? {
          id: contract.contacts.id,
          full_name: `${contract.contacts.first_name || ''} ${contract.contacts.last_name || ''}`.trim()
        } : null
      }
    })

    console.log('[contracts/route.ts] GET Returning formatted data, count:', formattedData.length)
    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
