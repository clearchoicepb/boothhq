/**
 * Available Merge Fields for Event Forms
 *
 * This file defines all the fields that can be used for:
 * - Pre-populating form fields from event data
 * - Saving form responses back to event data
 *
 * Fields are organized by category for easy selection in the UI.
 */

export type MergeFieldType = 'text' | 'textarea' | 'number' | 'date' | 'time' | 'email' | 'select'

export interface MergeField {
  key: string           // e.g., "events.title" or "contacts.first_name"
  label: string         // e.g., "Event Title" or "Contact First Name"
  type: MergeFieldType  // Data type for compatibility matching
  table: string         // e.g., "events", "contacts", "accounts", "locations", "event_dates"
  column: string        // e.g., "title", "first_name"
}

export interface MergeFieldCategory {
  id: string
  label: string
  fields: MergeField[]
}

/**
 * All available merge field categories and their fields
 */
export const mergeFieldCategories: MergeFieldCategory[] = [
  {
    id: 'event_details',
    label: 'Event Details',
    fields: [
      { key: 'events.id', label: 'Event ID', type: 'text', table: 'events', column: 'id' },
      { key: 'events.title', label: 'Event Title', type: 'text', table: 'events', column: 'title' },
      { key: 'events.description', label: 'Event Description', type: 'textarea', table: 'events', column: 'description' },
      { key: 'events.event_value', label: 'Event Value', type: 'text', table: 'events', column: 'event_value' },
      { key: 'events.guest_count', label: 'Guest Count', type: 'number', table: 'events', column: 'guest_count' },
      { key: 'events.payment_status', label: 'Payment Status', type: 'text', table: 'events', column: 'payment_status' },
    ]
  },
  {
    id: 'event_dates_times',
    label: 'Event Dates & Times',
    fields: [
      { key: 'event_dates.event_date', label: 'Event Date', type: 'date', table: 'event_dates', column: 'event_date' },
      { key: 'event_dates.setup_time', label: 'Setup Time', type: 'time', table: 'event_dates', column: 'setup_time' },
      { key: 'event_dates.start_time', label: 'Start Time', type: 'time', table: 'event_dates', column: 'start_time' },
      { key: 'event_dates.end_time', label: 'End Time', type: 'time', table: 'event_dates', column: 'end_time' },
      { key: 'event_dates.notes', label: 'Date Notes', type: 'textarea', table: 'event_dates', column: 'notes' },
      { key: 'events.load_in_time', label: 'Load-in Time', type: 'time', table: 'events', column: 'load_in_time' },
      { key: 'events.load_in_notes', label: 'Load-in Notes', type: 'textarea', table: 'events', column: 'load_in_notes' },
    ]
  },
  {
    id: 'event_classification',
    label: 'Event Classification',
    fields: [
      { key: 'events.event_category_id', label: 'Event Category', type: 'select', table: 'events', column: 'event_category_id' },
      { key: 'events.event_type_id', label: 'Event Type', type: 'select', table: 'events', column: 'event_type_id' },
    ]
  },
  {
    id: 'venue_location',
    label: 'Venue / Location',
    fields: [
      { key: 'locations.name', label: 'Venue Name', type: 'text', table: 'locations', column: 'name' },
      { key: 'locations.address_line1', label: 'Venue Address Line 1', type: 'text', table: 'locations', column: 'address_line1' },
      { key: 'locations.address_line2', label: 'Venue Address Line 2', type: 'text', table: 'locations', column: 'address_line2' },
      { key: 'locations.city', label: 'Venue City', type: 'text', table: 'locations', column: 'city' },
      { key: 'locations.state', label: 'Venue State', type: 'text', table: 'locations', column: 'state' },
      { key: 'locations.postal_code', label: 'Venue Postal Code', type: 'text', table: 'locations', column: 'postal_code' },
      { key: 'locations.country', label: 'Venue Country', type: 'text', table: 'locations', column: 'country' },
      { key: 'locations.contact_name', label: 'Venue Contact Name', type: 'text', table: 'locations', column: 'contact_name' },
      { key: 'locations.contact_phone', label: 'Venue Contact Phone', type: 'text', table: 'locations', column: 'contact_phone' },
      { key: 'locations.contact_email', label: 'Venue Contact Email', type: 'email', table: 'locations', column: 'contact_email' },
      { key: 'locations.notes', label: 'Venue Notes', type: 'textarea', table: 'locations', column: 'notes' },
    ]
  },
  {
    id: 'client_account',
    label: 'Client Info (Account)',
    fields: [
      { key: 'accounts.name', label: 'Account/Company Name', type: 'text', table: 'accounts', column: 'name' },
      { key: 'accounts.phone', label: 'Account Phone', type: 'text', table: 'accounts', column: 'phone' },
      { key: 'accounts.email', label: 'Account Email', type: 'email', table: 'accounts', column: 'email' },
      { key: 'accounts.website', label: 'Account Website', type: 'text', table: 'accounts', column: 'website' },
      { key: 'accounts.billing_address_line_1', label: 'Billing Address Line 1', type: 'text', table: 'accounts', column: 'billing_address_line_1' },
      { key: 'accounts.billing_address_line_2', label: 'Billing Address Line 2', type: 'text', table: 'accounts', column: 'billing_address_line_2' },
      { key: 'accounts.billing_city', label: 'Billing City', type: 'text', table: 'accounts', column: 'billing_city' },
      { key: 'accounts.billing_state', label: 'Billing State', type: 'text', table: 'accounts', column: 'billing_state' },
      { key: 'accounts.billing_zip_code', label: 'Billing Zip Code', type: 'text', table: 'accounts', column: 'billing_zip_code' },
    ]
  },
  {
    id: 'primary_contact',
    label: 'Primary Contact',
    fields: [
      { key: 'contacts.first_name', label: 'Contact First Name', type: 'text', table: 'contacts', column: 'first_name' },
      { key: 'contacts.last_name', label: 'Contact Last Name', type: 'text', table: 'contacts', column: 'last_name' },
      { key: 'contacts.email', label: 'Contact Email', type: 'email', table: 'contacts', column: 'email' },
      { key: 'contacts.phone', label: 'Contact Phone', type: 'text', table: 'contacts', column: 'phone' },
      { key: 'contacts.job_title', label: 'Contact Job Title', type: 'text', table: 'contacts', column: 'job_title' },
      { key: 'contacts.address_line_1', label: 'Contact Address Line 1', type: 'text', table: 'contacts', column: 'address_line_1' },
      { key: 'contacts.address_line_2', label: 'Contact Address Line 2', type: 'text', table: 'contacts', column: 'address_line_2' },
      { key: 'contacts.city', label: 'Contact City', type: 'text', table: 'contacts', column: 'city' },
      { key: 'contacts.state', label: 'Contact State', type: 'text', table: 'contacts', column: 'state' },
      { key: 'contacts.zip_code', label: 'Contact Zip Code', type: 'text', table: 'contacts', column: 'zip_code' },
    ]
  },
  {
    id: 'event_planner',
    label: 'Event Planner',
    fields: [
      { key: 'events.event_planner_name', label: 'Event Planner Name', type: 'text', table: 'events', column: 'event_planner_name' },
      { key: 'events.event_planner_phone', label: 'Event Planner Phone', type: 'text', table: 'events', column: 'event_planner_phone' },
      { key: 'events.event_planner_email', label: 'Event Planner Email', type: 'email', table: 'events', column: 'event_planner_email' },
    ]
  },
  {
    id: 'onsite_contact',
    label: 'Onsite Contact',
    fields: [
      { key: 'events.onsite_contact_name', label: 'Onsite Contact Name', type: 'text', table: 'events', column: 'onsite_contact_name' },
      { key: 'events.onsite_contact_phone', label: 'Onsite Contact Phone', type: 'text', table: 'events', column: 'onsite_contact_phone' },
      { key: 'events.onsite_contact_email', label: 'Onsite Contact Email', type: 'email', table: 'events', column: 'onsite_contact_email' },
    ]
  },
  {
    id: 'mailing_address',
    label: 'Mailing Address',
    fields: [
      { key: 'events.mailing_address_line1', label: 'Mailing Address Line 1', type: 'text', table: 'events', column: 'mailing_address_line1' },
      { key: 'events.mailing_address_line2', label: 'Mailing Address Line 2', type: 'text', table: 'events', column: 'mailing_address_line2' },
      { key: 'events.mailing_city', label: 'Mailing City', type: 'text', table: 'events', column: 'mailing_city' },
      { key: 'events.mailing_state', label: 'Mailing State', type: 'text', table: 'events', column: 'mailing_state' },
      { key: 'events.mailing_postal_code', label: 'Mailing Postal Code', type: 'text', table: 'events', column: 'mailing_postal_code' },
      { key: 'events.mailing_country', label: 'Mailing Country', type: 'text', table: 'events', column: 'mailing_country' },
    ]
  },
]

/**
 * Get all merge fields as a flat array
 */
export function getAllMergeFields(): MergeField[] {
  return mergeFieldCategories.flatMap(category => category.fields)
}

/**
 * Find a merge field by its key
 */
export function getMergeFieldByKey(key: string): MergeField | undefined {
  return getAllMergeFields().find(field => field.key === key)
}

/**
 * Get fields compatible with a given form field type
 *
 * Returns ALL fields regardless of form field type.
 * Users should be able to map any form field to any event data field.
 * Type conversion will be handled during pre-population and save operations.
 */
export function getCompatibleMergeFields(formFieldType: string): MergeField[] {
  // Return all fields - let users decide what makes sense for their use case
  return getAllMergeFields()
}

/**
 * Get compatible merge fields organized by category
 * Useful for rendering grouped dropdown options
 */
export function getCompatibleMergeFieldsByCategory(formFieldType: string): MergeFieldCategory[] {
  const compatibleFields = getCompatibleMergeFields(formFieldType)
  const compatibleKeys = new Set(compatibleFields.map(f => f.key))

  return mergeFieldCategories
    .map(category => ({
      ...category,
      fields: category.fields.filter(f => compatibleKeys.has(f.key))
    }))
    .filter(category => category.fields.length > 0)
}

/**
 * Get the display label for a merge field key
 * Returns the key itself if not found (for graceful degradation)
 */
export function getMergeFieldLabel(key: string): string {
  const field = getMergeFieldByKey(key)
  return field?.label ?? key
}

/**
 * Validate that a merge field key exists
 */
export function isValidMergeFieldKey(key: string): boolean {
  return getMergeFieldByKey(key) !== undefined
}
