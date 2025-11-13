import { FormConfig } from '../types'
import { inventoryItemFormConfig } from './inventoryItemFormConfig'

export interface InventorySettings {
  requiredFields?: {
    name?: boolean
    category?: boolean
    serialNumber?: boolean
    cost?: boolean
    location?: boolean
    status?: boolean
    purchaseDate?: boolean
    warrantyExpiry?: boolean
  }
}

/**
 * Applies inventory settings to the inventory item form configuration
 * Dynamically updates which fields are required based on settings
 */
export function applyInventorySettings(
  baseConfig: FormConfig<any>,
  settings?: InventorySettings
): FormConfig<any> {
  if (!settings?.requiredFields) {
    return baseConfig
  }

  const modifiedFields = baseConfig.fields.map(field => {
    const updatedField = { ...field }

    // Map settings keys to field names
    const fieldMapping: Record<string, string> = {
      name: 'item_name',
      category: 'item_category',
      serialNumber: 'serial_number',
      cost: 'item_value',
      purchaseDate: 'purchase_date'
    }

    // Find the settings key for this field
    const settingsKey = Object.keys(fieldMapping).find(
      key => fieldMapping[key] === field.name
    )

    if (settingsKey && settings.requiredFields) {
      const requiredValue = settings.requiredFields[settingsKey as keyof typeof settings.requiredFields]
      if (requiredValue !== undefined) {
        updatedField.required = requiredValue
      }
    }

    return updatedField
  })

  return {
    ...baseConfig,
    fields: modifiedFields
  }
}

/**
 * Gets the inventory form config with settings applied
 */
export function getInventoryFormConfig(settings?: InventorySettings): FormConfig<any> {
  return applyInventorySettings(inventoryItemFormConfig, settings)
}
