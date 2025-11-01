import { getTenantContext } from '@/lib/tenant-helpers'
import { NextResponse } from 'next/server'
export async function GET() {
  try {
    // Test if we can query the event_custom_items table
    const { data, error, count } = await supabase
      .from('event_custom_items')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Table does not exist or query failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Table event_custom_items exists and is queryable',
      count: count || 0
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
