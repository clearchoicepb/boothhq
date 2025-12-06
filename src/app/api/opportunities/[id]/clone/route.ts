import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:opportunities')
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { id: opportunityId } = await params
    // Fetch original opportunity with relations
    const { data: original, error: fetchError } = await supabase
      .from('opportunities')
      .select('*, event_dates(*)')
      .eq('id', opportunityId)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (fetchError || !original) {
      log.error({ fetchError }, 'Error fetching opportunity')
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Create clone with modified name
    const { event_dates, ...opportunityData } = original
    
    const clone = {
      ...opportunityData,
      id: undefined, // Let database generate new ID
      name: `${original.name} (Copy)`,
      created_at: undefined, // New timestamp
      updated_at: undefined, // New timestamp
      is_converted: false, // Reset conversion status
      converted_event_id: null,
      converted_at: null
    }

    // Insert cloned opportunity
    const { data: newOpportunity, error: createError } = await supabase
      .from('opportunities')
      .insert(clone)
      .select()
      .single()

    if (createError) {
      log.error({ createError }, 'Error creating clone')
      return NextResponse.json({ 
        error: 'Failed to clone opportunity',
        details: createError.message 
      }, { status: 500 })
    }

    // Clone event_dates if they exist
    if (event_dates && event_dates.length > 0) {
      const clonedDates = event_dates.map((ed: any) => ({
        tenant_id: dataSourceTenantId,
        opportunity_id: newOpportunity.id,
        event_date: ed.event_date,
        start_time: ed.start_time,
        end_time: ed.end_time,
        location_id: ed.location_id,
        notes: ed.notes,
        status: ed.status
      }))

      const { error: datesError } = await supabase
        .from('event_dates')
        .insert(clonedDates)

      if (datesError) {
        log.error({ datesError }, 'Error cloning event dates')
        // Don't fail - opportunity was created successfully
      }
    }

    return NextResponse.json({ 
      success: true, 
      opportunity: newOpportunity 
    })
  } catch (error) {
    log.error({ error }, 'Error in clone API')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

