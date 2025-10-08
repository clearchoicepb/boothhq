'use client'

import { useState, useEffect } from 'react'
import { EntityForm } from '@/components/forms/EntityForm'

interface InventoryFormProps {
  equipment?: any | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (equipment: any) => void
}

export function InventoryForm({ equipment, isOpen, onClose, onSubmit }: InventoryFormProps) {
  const handleSubmit = async (data: any) => {
    await onSubmit(data)
  }

  return (
    <EntityForm
      entity="inventory"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={equipment || undefined}
      title={equipment ? 'Edit Equipment' : 'New Equipment'}
      submitLabel={equipment ? 'Update Equipment' : 'Create Equipment'}
    />
  )
}







