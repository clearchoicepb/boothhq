'use client'

import React from 'react'
import { EntityForm } from './EntityForm'
import type { Event } from '@/lib/supabase-client'

interface EventFormProps {
  event?: Event | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (event: Event) => Promise<void> | void
}

export function EventForm({
  event,
  isOpen,
  onClose,
  onSubmit
}: EventFormProps) {
  const handleSubmit = async (data: any) => {
    try {
      const response = event 
        ? await fetch(`/api/events/${event.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
        : await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })

      if (!response.ok) {
        throw new Error('Failed to save event')
      }

      const savedEvent = await response.json()
      await onSubmit(savedEvent)
    } catch (error) {
      console.error('Error saving event:', error)
      throw error
    }
  }

  return (
    <EntityForm
      entity="events"
      initialData={event}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={event ? 'Edit Event' : 'Add New Event'}
      submitLabel={event ? 'Update Event' : 'Create Event'}
    />
  )
}
