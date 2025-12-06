'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { EntityForm } from './EntityForm'
import { contactFormConfig } from './configs'
import { DuplicateContactWarning } from '@/components/duplicate-contact-warning'
import type { Contact } from '@/lib/supabase-client'
import { createLogger } from '@/lib/logger'

const log = createLogger('forms')

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
  const params = useParams()
  const tenantSubdomain = params.tenant as string
  
  // State for duplicate email warning
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [duplicateContact, setDuplicateContact] = useState<{id: string, name: string, email: string} | null>(null)
  
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
    } catch (error: any) {
      log.error({ error }, 'Error saving contact')
      
      // Check if this is a duplicate email error (409)
      if (error.status === 409 && error.existingContact) {
        setDuplicateContact(error.existingContact)
        setShowDuplicateWarning(true)
        return // Don't throw - modal will handle it
      }
      
      throw error
    }
  }

  return (
    <>
      <EntityForm
        entity="contacts"
        initialData={initialData}
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        title={contact ? 'Edit Contact' : 'Add New Contact'}
        submitLabel={contact ? 'Update Contact' : 'Create Contact'}
      />
      
      {/* Duplicate Contact Warning Modal */}
      {duplicateContact && (
        <DuplicateContactWarning
          isOpen={showDuplicateWarning}
          onClose={() => {
            setShowDuplicateWarning(false)
            setDuplicateContact(null)
          }}
          existingContact={duplicateContact}
          tenantSubdomain={tenantSubdomain}
        />
      )}
    </>
  )
}
