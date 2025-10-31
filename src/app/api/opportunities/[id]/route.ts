import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_account_id_fkey(name, phone, email),
        contacts!opportunities_contact_id_fkey(first_name, last_name, phone, email),
        leads!opportunities_lead_id_fkey(first_name, last_name, phone, email),
        event_dates(*)
      `)
      .eq('id', (await params).id)
      .eq('tenant_id', dataSourceTenantId)
      .single()

    if (error) {
      console.error('Error fetching opportunity:', error)
      return NextResponse.json({ error: 'Failed to fetch opportunity' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Transform the data to include account_name and contact_name
    const transformedData = {
      ...data,
      account_name: data.accounts?.name || null,
      contact_name: data.contacts ? 
        `${data.contacts.first_name} ${data.contacts.last_name}`.trim() : null
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { event_dates, ...opportunityData } = body
    // Only allow fields that exist in the current database schema
    const allowedFields = [
      'name', 'description', 'amount', 'stage', 'probability',
      'expected_close_date', 'actual_close_date', 'account_id',
      'contact_id', 'lead_id', 'owner_id', 'event_type', 'date_type',
      'event_date', 'initial_date', 'final_date',
      'is_converted', 'converted_at',
      'converted_event_id', 'converted_from_opportunity_id',
      'close_reason', 'close_notes'
      // Not yet in schema: 'updated_by', 'created_by', 'mailing_address_*'
    ]

    const filteredData = Object.keys(opportunityData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = opportunityData[key]
        return obj
      }, {} as any)

    // AUTO-CALCULATE PROBABILITY based on stage if auto-calculate is enabled
    if (filteredData.stage) {
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

        if (settings.autoCalculateProbability === true || settings.autoCalculateProbability === 'true') {
          // Get stages array - it's already an array in the settings!
          const stages = settings.stages || []
          const stageConfig = stages.find(s => s.id === filteredData.stage)

          if (stageConfig) {
            // Handle both number and string probabilities
            const probability = typeof stageConfig.probability === 'number'
              ? stageConfig.probability
              : parseInt(stageConfig.probability)

            if (!isNaN(probability)) {
              filteredData.probability = probability
            }
          }
        }
      }
    }

    // Transform date_type from form values to database values (handle both form and DB formats)
    let finalDateType = filteredData.date_type
    if (filteredData.date_type === 'single_day') {
      finalDateType = 'single'
    } else if (['same_location_sequential', 'same_location_non_sequential', 'multiple_locations'].includes(filteredData.date_type)) {
      finalDateType = 'multiple'
    } else if (filteredData.date_type === 'single' || filteredData.date_type === 'multiple') {
      // Already in DB format, keep as is
      finalDateType = filteredData.date_type
    }

    filteredData.date_type = finalDateType

    // Handle date fields based on final date_type
    // IMPORTANT: Always clear unused fields to satisfy DB constraints
    if (finalDateType === 'single') {
      // For single day events: populate event_date if provided, always clear initial/final
      if (event_dates && Array.isArray(event_dates) && event_dates.length > 0) {
        const dates = event_dates.map(d => new Date(d.event_date)).sort((a, b) => a.getTime() - b.getTime())
        filteredData.event_date = dates[0].toISOString().split('T')[0]
      }
      // Must clear these even if no event_dates provided (to satisfy constraint)
      filteredData.initial_date = null
      filteredData.final_date = null
    } else if (finalDateType === 'multiple') {
      // For multiple day events: populate initial/final if provided, always clear event_date
      if (event_dates && Array.isArray(event_dates) && event_dates.length > 0) {
        const dates = event_dates.map(d => new Date(d.event_date)).sort((a, b) => a.getTime() - b.getTime())
        filteredData.initial_date = dates[0].toISOString().split('T')[0]
        filteredData.final_date = dates[dates.length - 1].toISOString().split('T')[0]
      }
      // Must clear this even if no event_dates provided (to satisfy constraint)
      filteredData.event_date = null
    }

    // Update the opportunity
    const updateData = {
      ...filteredData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', (await params).id)
      .eq('tenant_id', dataSourceTenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating opportunity:', error)
      return NextResponse.json({ error: 'Failed to update opportunity', details: error.message }, { status: 500 })
    }

    // Handle event dates if provided
    if (event_dates && Array.isArray(event_dates)) {
      // Delete existing event dates for this opportunity
      const opportunityId = (await params).id
      await supabase
        .from('event_dates')
        .delete()
        .eq('opportunity_id', opportunityId)
        .eq('tenant_id', dataSourceTenantId)

      // Insert new event dates
      if (event_dates.length > 0) {
        const eventDatesToInsert = event_dates.map((date: any) => ({
          tenant_id: dataSourceTenantId,
          opportunity_id: opportunityId,
          location_id: date.location_id || null,
          event_date: date.event_date,
          start_time: date.start_time,
          end_time: date.end_time,
          notes: date.notes || null,
        }))

        const { error: eventDatesError } = await supabase
          .from('event_dates')
          .insert(eventDatesToInsert)

        if (eventDatesError) {
          console.error('Error updating event dates:', eventDatesError)
          // Don't fail the entire request, just log the error
        }
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', (await params).id)
      .eq('tenant_id', dataSourceTenantId)

    if (error) {
      console.error('Error deleting opportunity:', error)
      return NextResponse.json({ error: 'Failed to delete opportunity' }, { status: 500 })
    }

    // Revalidate the opportunities list page to show deletion immediately
    const tenantSubdomain = session.user.tenantSubdomain || 'default'
    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/${tenantSubdomain}/opportunities`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






