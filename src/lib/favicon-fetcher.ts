import { createLogger } from '@/lib/logger'

const log = createLogger('lib')

/**
 * Utility functions for fetching favicons from websites
 */

export interface FaviconResult {
  success: boolean
  faviconUrl?: string
  error?: string
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (error) {
    log.error({ url, error }, 'Invalid URL')
    return null
  }
}

/**
 * Try multiple common favicon locations
 */
function getFaviconUrls(domain: string): string[] {
  const baseUrl = `https://${domain}`
  return [
    `${baseUrl}/favicon.ico`,
    `${baseUrl}/favicon.png`,
    `${baseUrl}/apple-touch-icon.png`,
    `${baseUrl}/apple-touch-icon-precomposed.png`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://favicons.githubusercontent.com/${domain}`,
  ]
}

/**
 * Check if a URL returns a valid image
 */
async function isValidImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FaviconFetcher/1.0)',
      },
    })
    
    if (!response.ok) return false
    
    const contentType = response.headers.get('content-type')
    return contentType?.startsWith('image/') || false
  } catch (error) {
    return false
  }
}

/**
 * Fetch favicon for a given website URL
 */
export async function fetchFavicon(websiteUrl: string): Promise<FaviconResult> {
  try {
    const domain = extractDomain(websiteUrl)
    if (!domain) {
      return { success: false, error: 'Invalid URL' }
    }

    const faviconUrls = getFaviconUrls(domain)
    
    // Try each favicon URL
    for (const faviconUrl of faviconUrls) {
      try {
        const isValid = await isValidImage(faviconUrl)
        if (isValid) {
          return { success: true, faviconUrl }
        }
      } catch (error) {
        // Continue to next URL
        continue
      }
    }

    return { success: false, error: 'No valid favicon found' }
  } catch (error) {
    log.error({ error }, 'Error fetching favicon')
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get a fallback favicon URL using Google's favicon service
 */
export function getFallbackFavicon(websiteUrl: string): string | null {
  const domain = extractDomain(websiteUrl)
  if (!domain) return null
  
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}





