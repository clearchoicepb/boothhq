'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LocationForm } from '@/components/location-form'
import { AppLayout } from '@/components/layout/app-layout'
import { AccessGuard } from '@/components/access-guard'
import { Location, LocationInsert, LocationUpdate } from '@/lib/supabase-client'
import { useTenant } from '@/lib/tenant-context'
import { usePermissions } from '@/lib/permissions'
import { createLogger } from '@/lib/logger'

const log = createLogger('locations')

export default function LocationsPage() {
  const router = useRouter()
  const { tenant } = useTenant()
  const { hasPermission } = usePermissions()
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load locations
  useEffect(() => {
    loadLocations()
  }, [tenant])

  const loadLocations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      } else {
        log.error('Failed to load locations')
      }
    } catch (error) {
      log.error({ error }, 'Error loading locations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLocation = () => {
    setEditingLocation(null)
    setIsFormOpen(true)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location)
    setIsFormOpen(true)
  }

  const handleSaveLocation = async (locationData: LocationInsert | LocationUpdate) => {
    try {
      setIsSaving(true)
      
      if (editingLocation) {
        // Update existing location
        const response = await fetch(`/api/locations/${editingLocation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(locationData),
        })

        if (response.ok) {
          const updatedLocation = await response.json()
          setLocations(prev => 
            prev.map(loc => loc.id === editingLocation.id ? updatedLocation : loc)
          )
        } else {
          throw new Error('Failed to update location')
        }
      } else {
        // Create new location
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
        } else {
          throw new Error('Failed to create location')
        }
      }
    } catch (error) {
      log.error({ error }, 'Error saving location')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLocation = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setLocations(prev => prev.filter(loc => loc.id !== location.id))
      } else {
        throw new Error('Failed to delete location')
      }
    } catch (error) {
      log.error({ error }, 'Error deleting location')
      alert('Failed to delete location. Please try again.')
    }
  }

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canManageLocations = hasPermission('events', 'create') // Using events permission for locations

  if (!canManageLocations) {
    return (
      <AccessGuard module="events">
        <AppLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to manage locations.</p>
          </div>
        </AppLayout>
      </AccessGuard>
    )
  }

  return (
    <AccessGuard module="events">
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
              <p className="text-gray-600">Manage event locations and venues</p>
            </div>
            <Button
              onClick={handleCreateLocation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Location
            </Button>
          </div>

          {/* Search */}
          <div className="max-w-md">
            <Input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Locations List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading locations...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No locations found' : 'No locations yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Get started by adding your first location'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={handleCreateLocation}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Your First Location
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {location.name}
                      </h3>
                      {location.is_one_time && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full mt-1">
                          One-time
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditLocation(location)}
                        title="Edit location"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLocation(location)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete location"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {location.address_line1 && (
                      <div>
                        <span className="font-medium">Address:</span>
                        <div>
                          {location.address_line1}
                          {location.address_line2 && <div>{location.address_line2}</div>}
                          <div>
                            {location.city && location.city}
                            {location.state && `, ${location.state}`}
                            {location.postal_code && ` ${location.postal_code}`}
                          </div>
                        </div>
                      </div>
                    )}

                    {location.contact_name && (
                      <div>
                        <span className="font-medium">Contact:</span> {location.contact_name}
                      </div>
                    )}

                    {location.contact_phone && (
                      <div>
                        <span className="font-medium">Phone:</span> {location.contact_phone}
                      </div>
                    )}

                    {location.contact_email && (
                      <div>
                        <span className="font-medium">Email:</span> {location.contact_email}
                      </div>
                    )}

                    {location.notes && (
                      <div>
                        <span className="font-medium">Notes:</span>
                        <div className="mt-1 text-gray-500">{location.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Location Form Modal */}
          <LocationForm
            location={editingLocation}
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSave={handleSaveLocation}
          />
        </div>
      </AppLayout>
    </AccessGuard>
  )
}





