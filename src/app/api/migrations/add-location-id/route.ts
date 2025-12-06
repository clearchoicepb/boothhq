import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:migrations')

export async function POST() {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId, session } = context

    log.debug('🚀 Starting migration: add_location_id_to_events')

    // Since we can't run DDL directly through Supabase client,
    // we'll use the database via the service role
    // The migration file should be run manually via Supabase dashboard or CLI

    // For now, let's just verify if the column exists
    const { data, error } = await supabase
      .from('events')
      .select('id, location, location_id')
      .limit(1)

    if (error) {
      if (error.message.includes('location_id')) {
        return NextResponse.json({
          success: false,
          message: 'location_id column does not exist yet. Please run the migration file manually.',
          instructions: [
            '1. Go to Supabase Dashboard > SQL Editor',
            '2. Run the migration file: supabase/migrations/20251015000000_add_location_id_to_events.sql',
            'Or use Supabase CLI: supabase db push'
          ]
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'location_id column already exists!',
      schema: {
        location: 'TEXT - Legacy field',
        location_id: 'UUID - Foreign key to locations table'
      }
    })

  } catch (error: any) {
    log.error({ error }, 'Migration check error')
    return NextResponse.json({
      error: error.message || 'Failed to check migration status'
    }, { status: 500 })
  }
}
