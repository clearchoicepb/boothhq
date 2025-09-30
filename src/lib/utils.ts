import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Fetches the favicon for a given URL using server-side API
 * @param url The website URL to get the favicon for
 * @returns Promise<string> Base64 encoded favicon image or null if not found
 */
export async function fetchFavicon(url: string): Promise<string | null> {
  try {
    // Use our server-side API route to avoid CORS issues
    const response = await fetch(`/api/favicon?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('Favicon API error:', response.status, response.statusText)
      return null
    }
    
    const data = await response.json()
    
    if (data.success && data.favicon) {
      return data.favicon
    }
    
    return null
  } catch (error) {
    console.error('Error fetching favicon:', error)
    return null
  }
}

/**
 * Checks if an account needs a favicon and fetches it if needed
 * @param account The account object
 * @returns Promise<string | null> The favicon URL or null if not found/not needed
 */
export async function getAccountFavicon(account: { business_url?: string | null; photo_url?: string | null; account_type: string }): Promise<string | null> {
  // Only fetch favicon for company accounts with business URL and no existing photo
  if (account.account_type === 'company' && 
      account.business_url && 
      !account.photo_url) {
    return await fetchFavicon(account.business_url)
  }
  return null
}
