import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { getMergeFieldData, replaceMergeFields } from '@/lib/merge-fields'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:contracts')

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// API endpoint for creating and fetching contracts
export async function POST(request: NextRequest) {
  log.debug({}, 'POST request received')
  log.debug({ url: request.url }, 'URL')
  log.debug({ method: request.method }, 'Method')
  
  try {
    log.debug({}, 'Getting tenant context...')
    const context = await getTenantContext()
    if (context instanceof NextResponse) {
      log.debug({}, 'Context returned NextResponse (error)')
      return context
    }

    const { supabase, dataSourceTenantId, session } = context
    log.debug({
      hasSupabase: !!supabase,
      dataSourceTenantId,
      hasSession: !!session
    }, 'Context obtained')

    if (!session?.user) {
      log.debug({}, 'No session user - Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    log.debug({}, 'Reading request body...')
    const body = await request.json()
    log.debug({ body }, 'Request body')
    
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
      log.debug({ event_id, has_template_content: !!template_content, title }, 'Missing required fields')
      return NextResponse.json(
        { error: 'event_id, template_content, and title are required' },
        { status: 400 }
      )
    }
    
    log.debug({}, 'All required fields present, proceeding...')

    // Get event data
    log.debug({ event_id }, 'Fetching event with ID')
    log.debug({ dataSourceTenantId }, 'Using tenant_id')
    
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

    log.debug({
      hasEvent: !!event,
      eventError: eventError?.message,
      eventErrorCode: eventError?.code,
      eventErrorDetails: eventError?.details
    }, 'Event query result')

    if (eventError || !event) {
      log.error({ eventError }, '[contracts/route.ts] Event not found. Error')
      return NextResponse.json({ 
        error: 'Event not found',
        debug: {
          event_id,
          tenant_id: dataSourceTenantId,
          error: eventError?.message
        }
      }, { status: 404 })
    }
    
    log.debug({ eventId: event.id, eventTitle: event.title }, 'Event found')

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
    
    log.debug({ keys: Object.keys(mergeData) }, 'Merge data built')

    // Replace merge fields in template
    const processedContent = replaceMergeFields(template_content, mergeData)

    // Generate contract number (RLS handles tenant filtering)
    const { count: contractCount } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })

    log.debug({ contractCount }, 'Contract count')
    const contractNumber = `CON-${String((contractCount || 0) + 1).padStart(5, '0')}`
    log.debug({ contractNumber }, 'Generated contract number')

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_days)

    // Validate recipient email exists (database column is NOT NULL)
    const recipientEmail = mergeData.contact_email || signer_email
    if (!recipientEmail) {
      log.debug({}, 'No recipient email found - event contact has no email')
      return NextResponse.json(
        { error: 'Cannot generate agreement: No recipient email found. Please ensure the event has a contact with an email address.' },
        { status: 400 }
      )
    }

    // Create contract using actual database schema column names
    // Note: Database uses template_name (not title), recipient_email (not signer_email), etc.
    const insertData: any = {
      tenant_id: dataSourceTenantId,
      event_id,
      content: processedContent,
      status: 'draft',
      template_name: title, // Database uses 'template_name' not 'title'
      recipient_email: recipientEmail, // Database column is NOT NULL
      recipient_name: mergeData.contact_full_name || signer_name || null // Database uses 'recipient_name' not 'signer_name'
    }
    
    // Add optional fields
    if (event.account_id) insertData.account_id = event.account_id
    if (event.contact_id) insertData.contact_id = event.contact_id
    if (template_id) insertData.template_id = template_id
    if (contractNumber) insertData.contract_number = contractNumber
    if (expiresAt) insertData.expires_at = expiresAt.toISOString()
    if (session.user.id) insertData.created_by = session.user.id
    
    log.debug({ keys: Object.keys(insertData) }, 'Inserting with data')
    log.debug({
      template_name: insertData.template_name,
      recipient_email: insertData.recipient_email,
      recipient_name: insertData.recipient_name,
      status: insertData.status
    }, 'Insert values')
    
    const { data: contract, error: contractError} = await supabase
      .from('contracts')
      .insert(insertData)
      .select()
      .single()
    
    log.debug({ hasContract: !!contract, error: contractError }, 'Insert result')

    if (contractError) {
      log.error({
        contractError,
        code: contractError.code,
        message: contractError.message,
        details: contractError.details,
        hint: contractError.hint
      }, 'Error creating contract')
      return NextResponse.json(
        {
          error: 'Failed to create contract',
          details: contractError.message,
          code: contractError.code
        },
        { status: 500 }
      )
    }

    log.debug({ id: contract.id }, 'Contract created successfully')
    log.debug({}, 'NOTE: File entry NOT auto-created - waiting for user to save')
    
    return NextResponse.json(contract)
  } catch (error) {
    log.error({ error, stack: error instanceof Error ? error.stack : 'No stack' }, 'ERROR in POST handler')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  log.debug({}, 'GET request received')
  log.debug({ url: request.url }, 'URL')
  
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context
    log.debug({
      hasSupabase: !!supabase,
      dataSourceTenantId,
      hasSession: !!session
    }, 'GET Context obtained')

    if (!session?.user) {
      log.debug({}, 'GET No session - Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    // Note: RLS handles tenant filtering automatically
    // Query without joins first - the events table schema varies
    let query = supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false })

    if (eventId) {
      query = query.eq('event_id', eventId)
    }

    const { data, error } = await query

    if (error) {
      log.error({
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      }, 'GET Error fetching contracts')
      return NextResponse.json(
        { error: 'Failed to fetch contracts', details: error.message },
        { status: 500 }
      )
    }

    log.debug({ count: data?.length || 0 }, 'GET Query successful, contracts count')

    // Fetch event names separately to avoid schema conflicts
    const contractsWithEventNames = await Promise.all(
      (data || []).map(async (contract) => {
        if (contract.event_id) {
          try {
            // Fetch just the event name - try different possible column names
            const { data: event } = await supabase
              .from('events')
              .select('id, name, event_name, event_type')
              .eq('id', contract.event_id)
              .single()
            
            if (event) {
              // Use whichever name field exists
              const eventName = event.name || event.event_name || event.event_type || 'Unknown Event'
              return {
                ...contract,
                event_name: eventName
              }
            }
          } catch (error) {
            log.debug({ contractId: contract.id }, 'Could not fetch event name for contract')
          }
        }
        return contract
      })
    )

    return NextResponse.json(contractsWithEventNames)
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
