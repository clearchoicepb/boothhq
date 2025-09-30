'use client'

import { useState, useEffect } from 'react'
import { EntityForm } from '@/components/forms/EntityForm'
import type { Payment } from '@/lib/supabase-client'

interface PaymentFormProps {
  payment?: Payment | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (payment: Payment) => void
}

export function PaymentForm({ payment, isOpen, onClose, onSubmit }: PaymentFormProps) {
  const handleSubmit = async (data: any) => {
    await onSubmit(data as Payment)
  }

  return (
    <EntityForm
      entity="payments"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={payment || undefined}
      title={payment ? 'Edit Payment' : 'New Payment'}
      submitLabel={payment ? 'Update Payment' : 'Create Payment'}
    />
  )
}