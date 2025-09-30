'use client'

import { useState, useEffect } from 'react'
import { EntityForm } from '@/components/forms/EntityForm'
import type { Invoice } from '@/lib/supabase-client'

interface InvoiceFormProps {
  invoice?: Invoice | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (invoice: Invoice) => void
}

export function InvoiceForm({ invoice, isOpen, onClose, onSubmit }: InvoiceFormProps) {
  const handleSubmit = async (data: any) => {
    await onSubmit(data as Invoice)
  }

  return (
    <EntityForm
      entity="invoices"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={invoice || undefined}
      title={invoice ? 'Edit Invoice' : 'New Invoice'}
      submitLabel={invoice ? 'Update Invoice' : 'Create Invoice'}
    />
  )
}