'use client'

import { forwardRef, useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { Select } from './select'
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps-loader'

export interface AddressData {
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface AddressInputProps {
  initialAddress?: AddressData | string
  onAddressChange?: (address: AddressData) => void
  className?: string
  disabled?: boolean
}

declare global {
  interface Window {
    google: any
  }
}

const AddressInput = forwardRef<HTMLDivElement, AddressInputProps>(
  ({ className, initialAddress, onAddressChange, disabled }, ref) => {
    const [addressData, setAddressData] = useState<AddressData>({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    })
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
    const [googleMapsError, setGoogleMapsError] = useState(false)
    const addressLine1Ref = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<any>(null)

    // Initialize address data from initialAddress prop
    useEffect(() => {
      if (initialAddress) {
        if (typeof initialAddress === 'string') {
          setAddressData(prev => ({ ...prev, address_line1: initialAddress }))
        } else {
          setAddressData({
            address_line1: initialAddress.address_line1 || '',
            address_line2: initialAddress.address_line2 || '',
            city: initialAddress.city || '',
            state: initialAddress.state || '',
            postal_code: initialAddress.postal_code || '',
            country: initialAddress.country || 'US'
          })
        }
      }
    }, [initialAddress])

    // Load Google Maps and initialize autocomplete
    useEffect(() => {
      if (typeof window === 'undefined' || disabled) return

      const initGoogle = async () => {
        try {
          if (isGoogleMapsLoaded()) {
            initializeAutocomplete()
            setGoogleMapsLoaded(true)
          } else {
            await loadGoogleMaps()
            initializeAutocomplete()
            setGoogleMapsLoaded(true)
          }
        } catch (error) {
          console.error('Failed to load Google Maps:', error)
          setGoogleMapsError(true)
          // Fallback: allow manual entry
        }
      }

      initGoogle()
    }, [disabled])

    const parseAddressComponents = (place: any): AddressData => {
      const addressComponents = place.address_components || []
      const parsed: AddressData = {
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US'
      }

      let streetNumber = ''
      let route = ''

      addressComponents.forEach((component: any) => {
        const types = component.types || []

        if (types.includes('street_number')) {
          streetNumber = component.long_name
        } else if (types.includes('route')) {
          route = component.long_name
        } else if (types.includes('locality')) {
          parsed.city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          parsed.state = component.short_name
        } else if (types.includes('postal_code')) {
          parsed.postal_code = component.long_name
        } else if (types.includes('country')) {
          parsed.country = component.short_name
        }
      })

      // Combine street number and route
      parsed.address_line1 = [streetNumber, route].filter(Boolean).join(' ')

      // If no street address, use the place name
      if (!parsed.address_line1 && place.name) {
        parsed.address_line1 = place.name
      }

      return parsed
    }

    const initializeAutocomplete = () => {
      if (!addressLine1Ref.current || !window.google) return

      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressLine1Ref.current,
          {
            types: ['establishment', 'geocode'],
            fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components']
          }
        )

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place && place.address_components) {
            const parsedAddress = parseAddressComponents(place)
            setAddressData(parsedAddress)

            if (onAddressChange) {
              onAddressChange(parsedAddress)
            }
          }
        })
      } catch (error) {
        console.error('Failed to initialize Google Places Autocomplete:', error)
        setGoogleMapsError(true)
      }
    }

    const handleFieldChange = (field: keyof AddressData, value: string) => {
      const newAddressData = { ...addressData, [field]: value }
      setAddressData(newAddressData)

      if (onAddressChange) {
        onAddressChange(newAddressData)
      }
    }

    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {googleMapsError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
            <p className="font-medium">Note: Address autocomplete is unavailable</p>
            <p className="text-xs mt-1">Please enter the address manually. Contact support if this persists.</p>
          </div>
        )}

        <div>
          <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <Input
            ref={addressLine1Ref}
            id="address_line1"
            type="text"
            value={addressData.address_line1}
            onChange={(e) => handleFieldChange('address_line1', e.target.value)}
            placeholder={googleMapsLoaded ? "Start typing venue name or address..." : "e.g., 123 Main Street"}
            disabled={disabled}
            className="w-full"
          />
          {googleMapsLoaded && (
            <p className="text-xs text-gray-500 mt-1">
              Start typing to search for venues and addresses with autocomplete
            </p>
          )}
        </div>

        <div>
          <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-1">
            Address Line 2 (Optional)
          </label>
          <Input
            id="address_line2"
            type="text"
            value={addressData.address_line2 || ''}
            onChange={(e) => handleFieldChange('address_line2', e.target.value)}
            placeholder="Suite, unit, building, floor, etc."
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <Input
              id="city"
              type="text"
              value={addressData.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="e.g., Cleveland"
              disabled={disabled}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <Input
              id="state"
              type="text"
              value={addressData.state}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              placeholder="e.g., OH"
              maxLength={2}
              disabled={disabled}
              className="w-full uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code *
            </label>
            <Input
              id="postal_code"
              type="text"
              value={addressData.postal_code}
              onChange={(e) => handleFieldChange('postal_code', e.target.value)}
              placeholder="e.g., 44114"
              disabled={disabled}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <Select
              id="country"
              value={addressData.country}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              disabled={disabled}
              className="w-full"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="MX">Mexico</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="NZ">New Zealand</option>
            </Select>
          </div>
        </div>
      </div>
    )
  }
)
AddressInput.displayName = 'AddressInput'

export { AddressInput }
