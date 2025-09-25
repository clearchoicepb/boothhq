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

    const initializeAutocomplete = () => {
      if (inputRef.current && window.google) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components']
        })

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace()
          if (place.formatted_address) {
            setInputValue(place.formatted_address)
            if (onChange) {
              onChange(place.formatted_address, place)
            }
            if (onAddressChange) {
              onAddressChange(place.formatted_address, place)
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
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-gray-900',
            className
          )}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Start typing an address..."
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
