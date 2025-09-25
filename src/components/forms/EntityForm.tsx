'use client'

import React from 'react'
import { BaseForm } from './BaseForm'
import { getFormConfig, EntityType } from './configs'
import { BaseFormProps } from './types'

interface EntityFormProps<T = any> extends Omit<BaseFormProps<T>, 'config'> {
  entity: EntityType
}

export function EntityForm<T extends Record<string, any>>({
  entity,
  ...props
}: EntityFormProps<T>) {
  const config = getFormConfig<T>(entity)

  return (
    <BaseForm
      config={config}
      {...props}
    />
  )
}
