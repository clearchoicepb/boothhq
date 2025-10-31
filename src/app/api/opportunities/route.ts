import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { searchParams } = new URL(request.url)
    const stageFilter = searchParams.get('stage') || 'all'

    let query = supabase
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_account_id_fkey(name, account_type),
        contacts!opportunities_contact_id_fkey(first_name, last_name)
      `)
      .eq('tenant_id', dataSourceTenantId)
      .order('created_at', { ascending: false })

    if (stageFilter !== 'all') {
      query = query.eq('stage', stageFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching opportunities:', error)
      return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
    }

    // Transform the data to include account_name, contact_name, and account_type
    const transformedData = data?.map(opportunity => ({
      ...opportunity,
      account_name: opportunity.accounts?.name || null,
      account_type: opportunity.accounts?.account_type || null,
      contact_name: opportunity.contacts ? 
        `${opportunity.contacts.first_name} ${opportunity.contacts.last_name}`.trim() : null
    })) || []

    const response = NextResponse.json(transformedData)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // Extract event_dates from the request body
    const { event_dates, ...opportunityData } = body

    // Clean up empty date fields that would cause database errors
    const cleanedOpportunityData = { ...opportunityData }
    
    // Convert empty string dates to null
    if (cleanedOpportunityData.expected_close_date === '') {
      cleanedOpportunityData.expected_close_date = null
    }
    if (cleanedOpportunityData.actual_close_date === '') {
      cleanedOpportunityData.actual_close_date = null
    }
    
    // Convert empty string dates to null and handle date_type
    if (cleanedOpportunityData.event_date === '') {
      cleanedOpportunityData.event_date = null
    }
    if (cleanedOpportunityData.initial_date === '') {
      cleanedOpportunityData.initial_date = null
    }
    if (cleanedOpportunityData.final_date === '') {
      cleanedOpportunityData.final_date = null
    }
    
    // Handle date_type mapping from form values to database values
    let finalDateType = cleanedOpportunityData.date_type
    if (cleanedOpportunityData.date_type === 'single_day') {
      finalDateType = 'single'
    } else if (['same_location_sequential', 'same_location_non_sequential', 'multiple_locations'].includes(cleanedOpportunityData.date_type)) {
      finalDateType = 'multiple'
    }
    cleanedOpportunityData.date_type = finalDateType

    // Populate event_date/initial_date/final_date from event_dates array
    if (event_dates && event_dates.length > 0) {
      const dates = event_dates
        .filter((d: any) => d.event_date)
        .map((d: any) => new Date(d.event_date))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())

      if (dates.length > 0) {
        if (finalDateType === 'single') {
          cleanedOpportunityData.event_date = dates[0].toISOString().split('T')[0]
          cleanedOpportunityData.initial_date = null
          cleanedOpportunityData.final_date = null
        } else if (finalDateType === 'multiple') {
          cleanedOpportunityData.event_date = null
          cleanedOpportunityData.initial_date = dates[0].toISOString().split('T')[0]
          cleanedOpportunityData.final_date = dates[dates.length - 1].toISOString().split('T')[0]
        }
      }
    } else {
      // No event dates provided, clear all date fields based on type
      if (finalDateType === 'single') {
        cleanedOpportunityData.initial_date = null
        cleanedOpportunityData.final_date = null
      } else if (finalDateType === 'multiple') {
        cleanedOpportunityData.event_date = null
      }
    }

    // Remove fields that don't exist in the current database schema
    delete cleanedOpportunityData.event_dates // event_dates is a separate table, not a column
    delete cleanedOpportunityData.mailing_address_line1
    delete cleanedOpportunityData.mailing_address_line2
    delete cleanedOpportunityData.mailing_city
    delete cleanedOpportunityData.mailing_state
    delete cleanedOpportunityData.mailing_postal_code
    delete cleanedOpportunityData.mailing_country

    // AUTO-CALCULATE INITIAL PROBABILITY based on stage if auto-calculate is enabled
    if (cleanedOpportunityData.stage) {
      // Get settings to check if auto-calculate is enabled
      const { data: settingsData } = await supabase
        .from('tenant_settings')
        .select('setting_key, setting_value')
        .eq('tenant_id', dataSourceTenantId)
        .like('setting_key', 'opportunities.%')

      if (settingsData) {
        const settings = settingsData.reduce((acc, s) => {
          const key = s.setting_key.replace('opportunities.', '')
          acc[key] = s.setting_value
          return acc
        }, {} as any)

        if (settings.autoCalculateProbability) {
          // Get stages array - it's already an array in the settings!
          const stages = settings.stages || []

          const stageConfig = stages.find((s: any) => s.id === cleanedOpportunityData.stage)
          if (stageConfig) {
            // Handle both number and string probabilities
            const probability = typeof stageConfig.probability === 'number'
              ? stageConfig.probability
              : parseInt(stageConfig.probability)

            if (!isNaN(probability)) {
              cleanedOpportunityData.probability = probability
              console.log(`Auto-calculating initial probability for stage ${cleanedOpportunityData.stage}: ${probability}%`)
            }
          }
        }
      }
    }

    // Auto-assign owner if not specified (default to creator)
    if (!cleanedOpportunityData.owner_id && session.user.id) {
      cleanedOpportunityData.owner_id = session.user.id
    }
    
    // Create the opportunity first
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .insert({
        ...cleanedOpportunityData,
        tenant_id: dataSourceTenantId
      })
      .select()
      .single()

    if (oppError) {
      console.error('Error creating opportunity:', oppError)
      return NextResponse.json({ error: 'Failed to create opportunity', details: oppError.message }, { status: 500 })
    }

    // Create event dates if provided
    if (event_dates && event_dates.length > 0) {
      // Filter out empty dates and explicitly map fields (match UPDATE logic)
      const eventDatesData = event_dates
        .filter((date: any) => date.event_date) // Only include dates with event_date filled
        .map((date: any) => ({
          tenant_id: dataSourceTenantId,
          opportunity_id: opportunity.id,
          location_id: date.location_id || null,
          event_date: date.event_date,
          start_time: date.start_time || null,
          end_time: date.end_time || null,
          notes: date.notes || null,
        }))

      if (eventDatesData.length > 0) {
        const { error: datesError } = await supabase
          .from('event_dates')
          .insert(eventDatesData)

        if (datesError) {
          console.error('Error creating event dates:', datesError)
          // Don't fail the entire request, just log the error
        }
      }
    }

    // Revalidate the opportunities list page to show new opportunity immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    revalidatePath(`/${tenantSubdomain}/opportunities`)

    const response = NextResponse.json(opportunity)
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30')
    
    return response
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}




