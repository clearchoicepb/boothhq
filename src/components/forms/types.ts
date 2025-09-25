export interface FieldConfig {
  name: string
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date' | 'datetime' | 'phone' | 'url' | 'password'
  label: string
  required?: boolean
  placeholder?: string
  options?: SelectOption[] | string // string for dynamic options (e.g., 'accounts')
  validation?: ValidationRule
  gridCols?: 1 | 2 | 3 | 4 // For responsive grid layout
  section?: string // Group fields into sections
  conditional?: ConditionalRule
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ConditionalRule {
  field: string
  operator: 'equals' | 'not_equals' | 'exists' | 'not_exists'
  value?: any
}

export interface RelatedDataConfig {
  key: string
  endpoint: string
  displayField: string
  valueField: string
}

export interface FormConfig<T = any> {
  entity: string
  fields: FieldConfig[]
  validation?: Record<string, ValidationRule>
  relatedData?: RelatedDataConfig[]
  defaultValues: Partial<T>
  sections?: FormSection[]
}

export interface FormSection {
  title: string
  fields: string[] // Field names
  collapsible?: boolean
  defaultExpanded?: boolean
}

export interface BaseFormProps<T> {
  config: FormConfig<T>
  initialData?: Partial<T>
  onSubmit: (data: T) => Promise<void> | void
  onClose: () => void
  isOpen: boolean
  title?: string
  submitLabel?: string
  className?: string
}

export interface FormState<T> {
  data: Partial<T>
  errors: Record<string, string>
  loading: boolean
  relatedData: Record<string, any[]>
}

export type EntityFormProps<T> = Omit<BaseFormProps<T>, 'config'> & {
  entity: string
}