// Export the main polymorphic form components
export { BaseForm } from './BaseForm'
export { EntityForm } from './EntityForm'

// Export specific form components (now using polymorphic system)
export { ContactForm } from './ContactForm'
export { AccountForm } from './AccountForm'
export { EventForm } from './EventForm'

// Export types
export type {
  FieldConfig,
  FormConfig,
  BaseFormProps,
  EntityFormProps,
  ValidationRule,
  SelectOption,
  RelatedDataConfig,
  FormState
} from './types'

// Export configurations
export {
  entityConfigs,
  getFormConfig,
  getAllEntityTypes,
  contactFormConfig,
  accountFormConfig,
  eventFormConfig,
  opportunityFormConfig,
  invoiceFormConfig
} from './configs'

export type { EntityType } from './configs'
