/**
 * Event Forms Type Definitions
 *
 * Type system for the Event Forms feature - custom questionnaires
 * that tenants can send to clients to gather event information.
 */

// ===========================================
// FORM FIELD TYPES
// ===========================================

/**
 * Supported field types for form builder
 * Note: 'file' type deferred to later phase
 */
export type FormFieldType =
  | 'text'        // Single line text input
  | 'textarea'    // Multi-line text input
  | 'select'      // Dropdown select (single choice)
  | 'multiselect' // Checkbox group (multiple choices)
  | 'radio'       // Radio button group (single choice)
  | 'star_rating' // Star rating (1-5 scale)
  | 'date'        // Date picker
  | 'time'        // Time picker
  | 'section'     // Section header (display only)
  | 'paragraph'   // Instructional text (display only)

/**
 * Base form field definition
 */
export interface FormField {
  id: string                    // Unique field ID (uuid)
  type: FormFieldType           // Field type
  label: string                 // Question/field label shown to client
  placeholder?: string          // Placeholder text
  helpText?: string             // Help text shown below field
  required: boolean             // Whether field is required
  order: number                 // Display order (for drag-drop reordering)
  options?: string[]            // Options for select/multiselect/radio
  content?: string              // Content for section headers and paragraphs
  maxRating?: number            // Max stars for star_rating (default 5)
  // Data mapping for merge tags (Phase 7B)
  prePopulateFrom?: string      // Merge field key to pull data from (e.g., "events.venue_contact_name")
  saveResponseTo?: string       // Merge field key to save response to (e.g., "events.venue_contact_name")
}

/**
 * Form field with value for display/editing
 */
export interface FormFieldWithValue extends FormField {
  value?: string | string[] | null
}

// ===========================================
// FORM RESPONSES
// ===========================================

/**
 * Structure for storing form responses
 */
export interface FormResponses {
  [fieldId: string]: string | string[] | null | undefined  // Field ID maps to response value
  _submittedAt?: string                         // ISO timestamp of submission
  _submittedBy?: string                         // Email or name if captured
  _submitterIp?: string                         // IP address for audit
}

// ===========================================
// FIELD MAPPINGS
// ===========================================

/**
 * Maps form field IDs to event database columns
 * Used to auto-update event fields when form is submitted
 */
export interface FormFieldMapping {
  fieldId: string               // Form field ID
  eventField: string            // Event table column name
  transform?: 'none' | 'date' | 'time' | 'number'  // Optional value transformation
}

export type FormFieldMappings = FormFieldMapping[]

// ===========================================
// TEMPLATE TYPES
// ===========================================

/**
 * Template category options
 */
export type FormTemplateCategory = 'logistics' | 'design' | 'survey' | 'feedback' | 'other'

/**
 * Form type - distinguishes client forms from staff forms
 */
export type FormType = 'client' | 'staff'

/**
 * Template status
 */
export type FormTemplateStatus = 'active' | 'inactive'

/**
 * Base event form template - matches database schema
 */
export interface EventFormTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  category: FormTemplateCategory
  form_type: FormType
  status: FormTemplateStatus
  fields: FormField[]
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Template for creation (without generated fields)
 */
export interface EventFormTemplateInsert {
  tenant_id?: string            // Usually set by API
  name: string
  description?: string | null
  category?: FormTemplateCategory
  form_type?: FormType          // Defaults to 'client'
  status?: FormTemplateStatus
  fields?: FormField[]
  created_by?: string           // Usually set by API
}

/**
 * Template for updates (all fields optional)
 */
export interface EventFormTemplateUpdate {
  name?: string
  description?: string | null
  category?: FormTemplateCategory
  form_type?: FormType
  status?: FormTemplateStatus
  fields?: FormField[]
}

// ===========================================
// FORM INSTANCE TYPES
// ===========================================

/**
 * Form status progression
 */
export type EventFormStatus = 'draft' | 'sent' | 'viewed' | 'completed'

/**
 * Base event form - matches database schema
 */
export interface EventForm {
  id: string
  tenant_id: string
  event_id: string
  template_id: string | null
  name: string
  fields: FormField[]
  responses: FormResponses | null
  status: EventFormStatus
  public_id: string
  sent_at: string | null
  viewed_at: string | null
  completed_at: string | null
  field_mappings: FormFieldMappings | null
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Event form with related data for display
 */
export interface EventFormWithRelations extends EventForm {
  template?: EventFormTemplate | null
  event?: {
    id: string
    title: string
    start_date: string | null
  } | null
}

/**
 * Form for creation (without generated fields)
 */
export interface EventFormInsert {
  tenant_id?: string            // Usually set by API
  event_id: string
  template_id?: string | null
  name: string
  fields?: FormField[]
  status?: EventFormStatus
  public_id?: string            // Usually generated by API
  field_mappings?: FormFieldMappings | null
  created_by?: string           // Usually set by API
}

/**
 * Form for updates (all fields optional)
 */
export interface EventFormUpdate {
  name?: string
  fields?: FormField[]
  responses?: FormResponses | null
  status?: EventFormStatus
  sent_at?: string | null
  viewed_at?: string | null
  completed_at?: string | null
  field_mappings?: FormFieldMappings | null
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

/**
 * Public form response (for unauthenticated access)
 */
export interface PublicFormResponse {
  form: {
    id: string
    name: string
    fields: FormField[]
    status: EventFormStatus
    responses: FormResponses | null
  }
  event: {
    title: string
    start_date: string | null
  } | null
  tenant: {
    name: string
    logoUrl: string | null
  }
  // Pre-populated values from merge tags
  prefilled?: {
    [fieldId: string]: string
  }
}

/**
 * Form submission payload
 */
export interface FormSubmissionPayload {
  responses: {
    [fieldId: string]: string | string[] | null
  }
  submitterEmail?: string
  submitterName?: string
}

// ===========================================
// UI STATE TYPES
// ===========================================

/**
 * Form builder state
 */
export interface FormBuilderState {
  fields: FormField[]
  selectedFieldId: string | null
  isDragging: boolean
}

/**
 * Template list filters
 */
export interface TemplateListFilters {
  status?: FormTemplateStatus | 'all'
  category?: FormTemplateCategory | 'all'
  search?: string
}

/**
 * Form list filters (on event)
 */
export interface EventFormListFilters {
  status?: EventFormStatus | 'all'
}

// ===========================================
// HELPER TYPE GUARDS
// ===========================================

/**
 * Check if a field type is an input type (not display-only)
 */
export function isInputFieldType(type: FormFieldType): boolean {
  return !['section', 'paragraph'].includes(type)
}

/**
 * Check if a field type supports options
 */
export function isOptionFieldType(type: FormFieldType): boolean {
  return ['select', 'multiselect', 'radio'].includes(type)
}

/**
 * Check if form has been submitted
 */
export function isFormCompleted(form: EventForm): boolean {
  return form.status === 'completed' && form.completed_at !== null
}

/**
 * Get display label for form status
 */
export function getFormStatusLabel(status: EventFormStatus): string {
  const labels: Record<EventFormStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    completed: 'Completed'
  }
  return labels[status]
}

/**
 * Get display label for template category
 */
export function getTemplateCategoryLabel(category: FormTemplateCategory): string {
  const labels: Record<FormTemplateCategory, string> = {
    logistics: 'Logistics',
    design: 'Design',
    survey: 'Survey',
    feedback: 'Feedback',
    other: 'Other'
  }
  return labels[category]
}
