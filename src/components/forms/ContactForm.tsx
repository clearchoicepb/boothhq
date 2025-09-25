'use client'

import React from 'react'
import { EntityForm } from './EntityForm'
import { contactFormConfig } from './configs'
import type { Contact } from '@/lib/supabase-client'

interface ContactFormProps {
  contact?: Contact | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (contact: Contact) => Promise<void> | void
  preSelectedAccountId?: string | null
}

export function ContactForm({
  contact,
  isOpen,
  onClose,
  onSubmit,
  preSelectedAccountId
}: ContactFormProps) {
  // Prepare initial data with pre-selected account
  const initialData = contact ? {
    ...contact,
    account_id: preSelectedAccountId || contact.account_id
  } : {
    account_id: preSelectedAccountId || null
  }

  const handleSubmit = async (data: any) => {
    try {
      // Use polymorphic API client
      const { apiClient } = await import('@/lib/polymorphic-api-client')
      
      const savedContact = contact 
        ? await apiClient.update('contacts', contact.id, data)
        : await apiClient.create('contacts', data)

      await onSubmit(savedContact)
    } catch (error) {
      console.error('Error saving contact:', error)
      throw error
    }
  }

  return (
    <EntityForm
      entity="contacts"
      initialData={initialData}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={contact ? 'Edit Contact' : 'Add New Contact'}
      submitLabel={contact ? 'Update Contact' : 'Create Contact'}
    />
  )
}
