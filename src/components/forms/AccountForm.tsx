'use client'

import React from 'react'
import { EntityForm } from './EntityForm'
import type { Account } from '@/lib/supabase-client'

interface AccountFormProps {
  account?: Account | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (account: Account) => Promise<void> | void
}

export function AccountForm({
  account,
  isOpen,
  onClose,
  onSubmit
}: AccountFormProps) {
  const handleSubmit = async (data: any) => {
    try {
      const response = account 
        ? await fetch(`/api/accounts/${account.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
        : await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })

      if (!response.ok) {
        throw new Error('Failed to save account')
      }

      const savedAccount = await response.json()
      await onSubmit(savedAccount)
    } catch (error) {
      console.error('Error saving account:', error)
      throw error
    }
  }

  return (
    <EntityForm
      entity="accounts"
      initialData={account}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={account ? 'Edit Account' : 'Add New Account'}
      submitLabel={account ? 'Update Account' : 'Create Account'}
    />
  )
}
