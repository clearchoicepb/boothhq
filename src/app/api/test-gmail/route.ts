import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('integration_type', 'gmail')
      .single()

    if (error) {
      return NextResponse.json({
        connected: false,
        error: error.message
      })
    }

    return NextResponse.json({
      connected: data?.is_connected || false,
      email: data?.settings?.email || null,
      created_at: data?.created_at
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
