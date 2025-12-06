import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant-helpers'
import { fetchFavicon, getFallbackFavicon } from '@/lib/favicon-fetcher'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:favicon')

export async function POST(request: NextRequest) {
  try {
  const context = await getTenantContext()
  if (context instanceof NextResponse) return context

  const { supabase, dataSourceTenantId, session } = context
    const { websiteUrl } = await request.json()
    
    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }


    // Try to fetch the actual favicon
    const result = await fetchFavicon(websiteUrl)
    
    if (result.success && result.faviconUrl) {
      return NextResponse.json({ 
        success: true, 
        faviconUrl: result.faviconUrl,
        source: 'direct'
      })
    }

    // Fallback to Google's favicon service
    const fallbackUrl = getFallbackFavicon(websiteUrl)
    if (fallbackUrl) {
      return NextResponse.json({ 
        success: true, 
        faviconUrl: fallbackUrl,
        source: 'fallback'
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'No favicon found' 
    }, { status: 404 })

  } catch (error) {
    log.error({ error }, 'Error in favicon API')
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}