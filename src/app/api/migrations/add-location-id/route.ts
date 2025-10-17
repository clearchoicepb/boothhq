import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-client'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()

    console.log('🚀 Starting migration: add_location_id_to_events')

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
    console.error('Migration check error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to check migration status'
    }, { status: 500 })
  }
}
