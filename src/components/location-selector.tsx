'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LocationForm } from '@/components/location-form'
import { Location, LocationInsert, LocationUpdate } from '@/lib/supabase-client'

interface LocationSelectorProps {
  selectedLocationId: string | null
  onLocationChange: (locationId: string | null) => void
  onNewLocationCreated?: (location: Location) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export function LocationSelector({
  selectedLocationId,
  onLocationChange,
  onNewLocationCreated,
  placeholder = "Select a location...",
  required = false,
  disabled = false
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Load locations
  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      } else {
        console.error('Failed to load locations')
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveLocation = async (locationData: LocationInsert | LocationUpdate) => {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      })

      if (response.ok) {
        const newLocation = await response.json()
        setLocations(prev => [newLocation, ...prev])
        onLocationChange(newLocation.id)
        onNewLocationCreated?.(newLocation)
        setIsFormOpen(false)
      } else {
        throw new Error('Failed to create location')
      }
    } catch (error) {
      console.error('Error saving location:', error)
      throw error
    }
  }

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId)
  
  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLocationSelect = (location: Location) => {
    onLocationChange(location.id)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  const handleClearSelection = () => {
    onLocationChange(null)
    setIsDropdownOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative">
      {/* Selected Location Display */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Location {required && <span className="text-red-500">*</span>}
        </label>
        
        {selectedLocation ? (
          <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{selectedLocation.name}</div>
              {selectedLocation.address_line1 && (
                <div className="text-sm text-gray-600">
                  {selectedLocation.address_line1}
                  {selectedLocation.city && `, ${selectedLocation.city}`}
                  {selectedLocation.state && `, ${selectedLocation.state}`}
                </div>
              )}
              {selectedLocation.is_one_time && (
                <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                  One-time
                </span>
              )}
            </div>
            <div className="flex space-x-2 ml-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={disabled}
              >
                Change
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={disabled}
                className="text-red-600 hover:text-red-700"
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              disabled={disabled}
              required={required}
            />
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(true)}
                disabled={disabled}
              >
                Add New Location
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-center text-gray-500">
              Loading locations...
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              {searchTerm ? 'No locations found' : 'No locations available'}
            </div>
          ) : (
            <div className="py-1">
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => handleLocationSelect(location)}
                >
                  <div className="font-medium text-gray-900">{location.name}</div>
                  {location.address_line1 && (
                    <div className="text-sm text-gray-600">
                      {location.address_line1}
                      {location.city && `, ${location.city}`}
                      {location.state && `, ${location.state}`}
                    </div>
                  )}
                  {location.is_one_time && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                      One-time
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Location Form Modal */}
      <LocationForm
        location={null}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveLocation}
        title="Add New Location"
      />

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  )
}





