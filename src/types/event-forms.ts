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
  | 'file_upload' // File upload (images, PDFs, design files)

/**
 * Field scope for multi-day events
 * - 'shared': Field applies to all event dates (default)
 * - 'per_date': Field can have different values per event date
 */
export type FormFieldScope = 'shared' | 'per_date'

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
  // File upload specific (for file_upload type)
  maxFileSize?: number          // Max file size in bytes (default 25MB)
  acceptedTypes?: string[]      // Accepted MIME types (default: all supported)
  // Multi-day event support
  scope?: FormFieldScope        // 'shared' (default) or 'per_date' - determines if field appears once or per date
}

/**
 * Supported file types for file_upload field
 * Maps MIME type to file extensions
 */
export const FILE_UPLOAD_ACCEPTED_TYPES: Record<string, string[]> = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'image/tiff': ['.tiff', '.tif'],
  'image/svg+xml': ['.svg'],
  // Design files
  'image/vnd.adobe.photoshop': ['.psd'],
  'application/postscript': ['.ai'],
  'application/pdf': ['.pdf'],
}

/**
 * Default max file size for file_upload (25MB)
 */
export const FILE_UPLOAD_MAX_SIZE = 25 * 1024 * 1024

/**
 * Get all accepted MIME types as array
 */
export function getAcceptedMimeTypes(): string[] {
  return Object.keys(FILE_UPLOAD_ACCEPTED_TYPES)
}

/**
 * Get file extensions string for input accept attribute
 */
export function getAcceptedFileExtensions(): string {
  const extensions = Object.values(FILE_UPLOAD_ACCEPTED_TYPES).flat()
  return extensions.join(',')
}

/**
 * Check if a MIME type is accepted for file upload
 */
export function isAcceptedFileType(mimeType: string): boolean {
  return mimeType in FILE_UPLOAD_ACCEPTED_TYPES
}

/**
 * Check if a file path/name represents a previewable image
 */
export function isPreviewableImage(pathOrName: string): boolean {
  const ext = pathOrName.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
}

/**
 * Extract filename from storage path
 */
export function getFileNameFromPath(path: string): string {
  return path.split('/').pop() || 'file'
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
 * Per-date response value for multi-day events
 * Maps event_date_id to the response value for that date
 */
export type PerDateResponseValue = Record<string, string | string[] | number | null>

/**
 * Response value can be:
 * - Simple value (string, string[], number, null) for shared fields
 * - Per-date map for per_date scoped fields
 */
export type FormResponseValue =
  | string
  | string[]
  | number
  | null
  | undefined
  | PerDateResponseValue  // For per-date fields: { [event_date_id]: value }

/**
 * Type guard to check if a response value is a per-date response
 */
export function isPerDateResponse(value: FormResponseValue): value is PerDateResponseValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    // Check if keys look like UUIDs (per-date responses) vs other object properties
    Object.keys(value).every(key =>
      key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    )
  )
}

/**
 * Structure for storing form responses
 * Supports both shared responses (single value) and per-date responses (map of date_id to value)
 */
export interface FormResponses {
  [fieldId: string]: FormResponseValue          // Field ID maps to response value (shared or per-date)
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
  event_date_id: string | null  // Optional link to specific date (NULL = shared, set = per-date form)
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
  event_date_id?: string | null // Optional link to specific date for per-date forms
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
 * Check if a field type is a file upload
 */
export function isFileUploadFieldType(type: FormFieldType): boolean {
  return type === 'file_upload'
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
