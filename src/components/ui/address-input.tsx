'use client'

import { forwardRef, useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'
import { loadGoogleMaps, isGoogleMapsLoaded } from '@/lib/google-maps-loader'

export interface AddressInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (address: string, details?: any) => void
  onPlaceSelect?: (place: any) => void
  onAddressChange?: (address: string, details?: any) => void
  initialAddress?: string
}

declare global {
  interface Window {
    google: any
  }
}

const AddressInput = forwardRef<HTMLInputElement, AddressInputProps>(
  ({ className, value = '', onChange, onPlaceSelect, onAddressChange, initialAddress, ...props }, ref) => {
    const [inputValue, setInputValue] = useState(value || initialAddress || '')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<any>(null)

    useEffect(() => {
      setInputValue(value)
    }, [value])

    useEffect(() => {
      // Load Google Maps API
      if (typeof window !== 'undefined') {
        if (isGoogleMapsLoaded()) {
          initializeAutocomplete()
        } else {
          loadGoogleMaps()
            .then(() => {
              initializeAutocomplete()
            })
            .catch((error) => {
              console.error('Failed to load Google Maps:', error)
            })
        }
      }
    }, [])

    const parseAddressComponents = (place: any) => {
      const addressComponents = place.address_components || []
      const parsed: any = {
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

      return parsed
    }

    const initializeAutocomplete = () => {
      if (inputRef.current && window.google) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components', 'business_status', 'types']
        })

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.formatted_address) {
            setInputValue(place.formatted_address)

            // Parse address components for structured data
            const parsedAddress = parseAddressComponents(place)

            if (onChange) {
              onChange(place.formatted_address, place)
            }
            if (onAddressChange) {
              onAddressChange(parsedAddress, place)
            }
            if (onPlaceSelect) {
              onPlaceSelect(place)
            }
          }
        })
      }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      if (onChange) {
        onChange(newValue)
      }
      if (onAddressChange) {
        onAddressChange(newValue)
      }
    }

    const handleSuggestionClick = (suggestion: any) => {
      setInputValue(suggestion.formatted_address)
      setShowSuggestions(false)
      if (onChange) {
        onChange(suggestion.formatted_address, suggestion)
      }
      if (onAddressChange) {
        onAddressChange(suggestion.formatted_address, suggestion)
      }
      if (onPlaceSelect) {
        onPlaceSelect(suggestion)
      }
    }

    return (
      <div className="relative">
        <Input
          ref={inputRef}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search for venue, hotel, or address..."
          {...props}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-900"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.formatted_address}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
AddressInput.displayName = 'AddressInput'

export { AddressInput }
