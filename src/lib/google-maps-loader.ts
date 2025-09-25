declare global {
  interface Window {
    google: any
    googleMapsLoaded: boolean
  }
}

let googleMapsPromise: Promise<void> | null = null

export const loadGoogleMaps = (): Promise<void> => {
  // If already loaded, return resolved promise
  if (window.google && window.googleMapsLoaded) {
    return Promise.resolve()
  }

  // If already loading, return the existing promise
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  // Create new promise to load Google Maps
  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.googleMapsLoaded = true
        resolve()
      })
      existingScript.addEventListener('error', reject)
      return
    }

    // Create new script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      window.googleMapsLoaded = true
      resolve()
    }
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API')
      reject(new Error('Failed to load Google Maps API'))
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export const isGoogleMapsLoaded = (): boolean => {
  return !!(window.google && window.googleMapsLoaded)
}
