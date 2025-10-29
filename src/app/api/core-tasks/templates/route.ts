import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await getTenantDatabaseClient(session.user.tenantId)

    const { data: templates, error } = await supabase
      .from('core_task_templates')
      .select('*')
      .eq('tenant_id', session.user.tenantId)
      .eq('is_active', true)
      .order('display_order')

    if (error) throw error

    return NextResponse.json({
      templates: templates || [],
      count: templates?.length || 0
    })
  } catch (error: any) {
    console.error('Error fetching core task templates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
