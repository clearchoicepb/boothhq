import { contactFormConfig } from './contactFormConfig'
import { accountFormConfig } from './accountFormConfig'
import { eventFormConfig } from './eventFormConfig'
import { opportunityFormConfig } from './opportunityFormConfig'
import { invoiceFormConfig } from './invoiceFormConfig'
import { userFormConfig } from './userFormConfig'
import { roleFormConfig } from './roleFormConfig'
import { leadFormConfig } from './leadFormConfig'
import { paymentFormConfig } from './paymentFormConfig'
import { inventoryFormConfig } from './inventoryFormConfig'
import { inventoryItemFormConfig } from './inventoryItemFormConfig'
import { physicalAddressFormConfig } from './physicalAddressFormConfig'
import { productGroupFormConfig } from './productGroupFormConfig'
import { FormConfig } from '../types'

export const entityConfigs = {
  contacts: contactFormConfig,
  accounts: accountFormConfig,
  events: eventFormConfig,
  opportunities: opportunityFormConfig,
  invoices: invoiceFormConfig,
  users: userFormConfig,
  roles: roleFormConfig,
  leads: leadFormConfig,
  payments: paymentFormConfig,
  inventory: inventoryFormConfig,
  inventory_item: inventoryItemFormConfig,
  physical_address: physicalAddressFormConfig,
  product_group: productGroupFormConfig
} as const

export type EntityType = keyof typeof entityConfigs

export function getFormConfig<T>(entity: EntityType): FormConfig<T> {
  const config = entityConfigs[entity]
  if (!config) {
    throw new Error(`No form configuration found for entity: ${entity}`)
  }
  return config as FormConfig<T>
}

export function getAllEntityTypes(): EntityType[] {
  return Object.keys(entityConfigs) as EntityType[]
}

// Export individual configs for direct import
export {
  contactFormConfig,
  accountFormConfig,
  eventFormConfig,
  opportunityFormConfig,
  invoiceFormConfig,
  inventoryItemFormConfig,
  physicalAddressFormConfig,
  productGroupFormConfig
}
