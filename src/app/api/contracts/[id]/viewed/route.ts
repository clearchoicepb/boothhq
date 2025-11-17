import { getTenantContext } from '@/lib/tenant-helpers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext()
    if (context instanceof NextResponse) return context

    const { supabase, dataSourceTenantId } = context
    const { id } = await params

    // Update contract to mark as viewed
    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', dataSourceTenantId)
      .eq('status', 'sent') // Only update if currently 'sent'
      .select()
      .single()

    if (error) {
      console.error('Error marking contract as viewed:', error)
      return NextResponse.json(
        { error: 'Failed to update contract status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, contract: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

