import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchFavicon, getFallbackFavicon } from '@/lib/favicon-fetcher'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { websiteUrl } = await request.json()
    
    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 })
    }

    console.log('Fetching favicon for:', websiteUrl)

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
    console.error('Error in favicon API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}