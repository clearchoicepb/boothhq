import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:public:contracts')

/**
 * Public API to mark contract as viewed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Create Supabase client with service role key
    const supabaseUrl = process.env.DEFAULT_TENANT_DATA_URL
    const supabaseServiceKey = process.env.DEFAULT_TENANT_DATA_SERVICE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update contract to mark as viewed
    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'sent') // Only update if currently 'sent'
      .select()
      .single()

    if (error) {
      log.error({ error }, 'Error marking contract as viewed')
      return NextResponse.json(
        { error: 'Failed to update contract status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, contract: data })
  } catch (error) {
    log.error({ error }, 'Error')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
