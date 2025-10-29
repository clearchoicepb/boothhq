import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTenantDatabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    // Get all settings for this tenant
    const { data: settings, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', session.user.tenantId)

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Convert array to nested object
    const settingsObject = settings?.reduce((acc, setting) => {
      const keys = setting.setting_key.split('.')
      let current = acc
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = setting.setting_value
      return acc
    }, {} as Record<string, any>) || {}

    const response = NextResponse.json({ settings: settingsObject })
    
    // Settings are tenant-specific and need immediate updates when changed
    // Use minimal caching to ensure changes appear immediately
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate')
    
    return response
  } catch (error) {
    console.error('Error in GET /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 })
    }

    const supabase = await getTenantDatabaseClient(session.user.tenantId)
    
    // Convert nested settings object to flat array of key-value pairs
    const settingsArray: Array<{tenant_id: string, setting_key: string, setting_value: any}> = []
    
    const flattenSettings = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Recursively flatten nested objects
          flattenSettings(value, fullKey)
        } else {
          // Handle arrays and primitive values
          settingsArray.push({
            tenant_id: session.user.tenantId,
            setting_key: fullKey,
            setting_value: value
          })
        }
      }
    }
    
    flattenSettings(settings)

    // Use upsert to handle existing settings
    const { error } = await supabase
      .from('tenant_settings')
      .upsert(settingsArray, {
        onConflict: 'tenant_id,setting_key'
      })

    if (error) {
      console.error('Error saving settings:', error)
      
      // If it's a duplicate key error, try individual upserts
      if (error.code === '23505') {
        for (const setting of settingsArray) {
          const { error: individualError } = await supabase
            .from('tenant_settings')
            .upsert(setting, {
              onConflict: 'tenant_id,setting_key'
            })
          if (individualError) {
            console.error('Individual setting error:', individualError)
            return NextResponse.json({ 
              error: 'Failed to save settings', 
              details: individualError.message 
            }, { status: 500 })
          }
        }
      } else {
        return NextResponse.json({ 
          error: 'Failed to save settings', 
          details: error.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
