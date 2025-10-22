'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect, SearchableOption } from '@/components/ui/searchable-select'
import { LocationForm } from '@/components/location-form'

interface Location {
  id: string
  name: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  notes?: string
}

interface LocationSelectProps {
  value: string | null
  onChange: (locationId: string | null, location?: Location) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  allowCreate?: boolean
  className?: string
}

export function LocationSelect({
  value,
  onChange,
  label = "Location",
  placeholder = "Search locations...",
  required = false,
  disabled = false,
  allowCreate = true,
  className = ""
}: LocationSelectProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      // Bypass cache to ensure we get fresh data (especially for newly created locations)
      const response = await fetch('/api/locations', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationCreated = (location: Location) => {
    setLocations(prev => [location, ...prev])
    onChange(location.id, location)
    setIsFormOpen(false)
    setEditingLocation(null)
  }

  const handleLocationUpdated = (location: Location) => {
    setLocations(prev => prev.map(loc => loc.id === location.id ? location : loc))
    onChange(location.id, location)
    setIsFormOpen(false)
    setEditingLocation(null)
  }

  const handleChange = (locationId: string | null) => {
    const location = locations.find(loc => loc.id === locationId)
    onChange(locationId, location)
  }

  const handleEditLocation = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId)
    if (location) {
      setEditingLocation(location)
      setIsFormOpen(true)
    }
  }

  const options: SearchableOption[] = locations.map(location => ({
    id: location.id,
    label: location.name,
    subLabel: [
      location.address_line1,
      location.city && location.state ? `${location.city}, ${location.state}` : location.city || location.state
    ].filter(Boolean).join(' • '),
    metadata: location
  }))

  const selectedLocation = locations.find(loc => loc.id === value)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <SearchableSelect
            options={options}
            value={value}
            onChange={handleChange}
            label={label}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            loading={loading}
            onCreate={allowCreate ? () => { setEditingLocation(null); setIsFormOpen(true); } : undefined}
            createButtonLabel="Create New Location"
            emptyMessage="No locations found"
            className={className}
          />
        </div>
        {value && selectedLocation && (
          <button
            onClick={() => handleEditLocation(value)}
            className="px-3 py-2 text-sm text-[#347dc4] hover:bg-blue-50 border border-gray-300 rounded-md transition-colors"
            type="button"
          >
            Edit Location
          </button>
        )}
      </div>

      {allowCreate && (
        <LocationForm
          location={editingLocation}
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingLocation(null); }}
          onSave={async (locationData) => {
            const url = editingLocation ? `/api/locations/${editingLocation.id}` : '/api/locations'
            const method = editingLocation ? 'PUT' : 'POST'

            const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(locationData)
            })

            if (!response.ok) {
              throw new Error('Failed to save location')
            }

            const location = await response.json()

            if (editingLocation) {
              handleLocationUpdated(location)
            } else {
              handleLocationCreated(location)
            }
          }}
        />
      )}
    </div>
  )
}
