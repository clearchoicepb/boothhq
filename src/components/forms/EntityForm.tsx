'use client'

import React from 'react'
import { BaseForm } from './BaseForm'
import { getFormConfig, EntityType } from './configs'
import { BaseFormProps } from './types'
import { useSettings } from '@/lib/settings-context'
import { applyInventorySettings } from './configs/applyInventorySettings'

interface EntityFormProps<T = any> extends Omit<BaseFormProps<T>, 'config'> {
  entity: EntityType
}

export function EntityForm<T extends Record<string, any>>({
  entity,
  ...props
}: EntityFormProps<T>) {
  const { getSetting } = useSettings()
  let config = getFormConfig<T>(entity)

  // Apply inventory settings if this is an inventory item form
  if (entity === 'inventory_item') {
    const inventorySettings = getSetting('inventory', {})
    config = applyInventorySettings(config, inventorySettings)
  }

  return (
    <BaseForm
      config={config}
      {...props}
    />
  )
}
